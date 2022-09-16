import * as stream from 'stream';
import { err, ok, Result } from 'neverthrow';
import {
	CategoryRequestMeta,
	HASRequestMeta,
	RequestGenerator
} from './RequestGenerator';
import {
	FileNotFoundError,
	HttpQueue,
	QueueError,
	Request,
	RequestMethod
} from '../HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';
import { injectable } from 'inversify';
import { Url } from '../../../shared/domain/Url';
import { LedgerHeaderHash, ScanError } from './HistoryArchiveScanner';
import { GapFoundError } from './GapFoundError';
import { HASBucketHashExtractor } from '../history-archive/HASBucketHashExtractor';
import * as http from 'http';
import * as https from 'https';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';
import { isObject } from '../../../shared/utilities/TypeGuards';
import * as workerpool from 'workerpool';
import { WorkerPool } from 'workerpool';
import { Category } from '../history-archive/Category';
import { CategoryVerificationError } from './CategoryVerificationError';
import {
	processLedgerHeaderHistoryEntryXDR,
	processTransactionHistoryEntryXDR,
	processTransactionHistoryResultEntryXDR
} from './hash-worker';
import { createHash } from 'crypto';
import { getMaximumNumber } from '../../../shared/utilities/getMaximumNumber';
import { createGunzip } from 'zlib';
import { XdrStreamReader } from './XdrStreamReader';

type Ledger = number;
type Hash = string;

type ExpectedHashesPerLedger = Map<
	Ledger,
	{
		txSetHash: Hash;
		txSetResultHash: Hash;
		previousLedgerHeaderHash: Hash;
	}
>;
type CalculatedTxSetHashes = Map<Ledger, Hash>;
type CalculatedTxSetResultHashes = Map<Ledger, Hash>;
type LedgerHeaderHashes = Map<Ledger, Hash | undefined>;

@injectable()
export class CategoryScanner {
	private pool: WorkerPool;

	static ZeroXdrHash = '3z9hmASpL9tAVxktxD3XSOp3itxSvEmM6AUkwBS4ERk=';
	static ZeroHash = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

	constructor(
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue
	) {
		try {
			require(__dirname + '/hash-worker.import.js');
			this.pool = workerpool.pool(__dirname + '/hash-worker.import.js');
		} catch (e) {
			this.pool = workerpool.pool(__dirname + '/hash-worker.js');
		}
	}

	//fetches all HAS files in checkpoint range and returns all detected bucket urls
	public async scanHASFilesAndReturnBucketHashes(
		historyBaseUrl: Url,
		checkPoints: IterableIterator<number>,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<Set<string>, GapFoundError | ScanError>> {
		const historyArchiveStateURLGenerator =
			RequestGenerator.generateHASRequests(
				historyBaseUrl,
				checkPoints,
				RequestMethod.GET
			);

		const bucketHashes = new Set<string>();
		const successOrError = await this.httpQueue.sendRequests(
			historyArchiveStateURLGenerator,
			{
				stallTimeMs: 150,
				concurrency: concurrency,
				nrOfRetries: 5,
				rampUpConnections: true,
				httpOptions: {
					httpAgent: httpAgent,
					httpsAgent: httpsAgent,
					responseType: 'json',
					timeoutMs: 10000
				}
			},
			async (result: unknown, request) => {
				if (!isObject(result)) {
					return new FileNotFoundError(request);
				}
				const validateHASResult = this.hasValidator.validate(result);
				if (validateHASResult.isOk()) {
					HASBucketHashExtractor.getNonZeroHashes(
						validateHASResult.value
					).forEach((hash) => bucketHashes.add(hash));
				} else {
					return new QueueError<HASRequestMeta>(
						request,
						validateHASResult.error
					);
				}
			}
		);

		if (successOrError.isErr()) {
			return err(
				mapHttpQueueErrorToScanError(
					successOrError.error,
					successOrError.error.request.meta.checkPoint
				)
			);
		}

		return ok(bucketHashes);
	}

	async scanOtherCategories(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		verify = false,
		previousLedgerHeaderHash?: LedgerHeaderHash
	): Promise<
		Result<
			void | LedgerHeaderHash,
			GapFoundError | ScanError | CategoryVerificationError
		>
	> {
		if (!verify)
			return await this.otherCategoriesExist(
				baseUrl,
				concurrency,
				checkPoints,
				httpAgent,
				httpsAgent
			);

		return await this.verifyOtherCategories(
			baseUrl,
			concurrency,
			checkPoints,
			httpAgent,
			httpsAgent,
			previousLedgerHeaderHash
		);
	}

	private async verifyOtherCategories(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		previousLedgerHeaderHash?: LedgerHeaderHash
	): Promise<
		Result<
			void | LedgerHeaderHash,
			GapFoundError | ScanError | CategoryVerificationError
		>
	> {
		const calculatedTxSetHashes: CalculatedTxSetHashes = new Map();
		const expectedHashesPerLedger: ExpectedHashesPerLedger = new Map();
		const calculatedTxSetResultHashes: CalculatedTxSetResultHashes = new Map();
		const ledgerHeaderHashes: LedgerHeaderHashes = new Map();
		if (previousLedgerHeaderHash)
			ledgerHeaderHashes.set(
				previousLedgerHeaderHash.ledger,
				previousLedgerHeaderHash.hash
			);

		const processRequestResult = async (
			result: unknown,
			request: Request<CategoryRequestMeta>
		): Promise<QueueError<CategoryRequestMeta> | undefined> => {
			return new Promise<undefined>((resolve, reject) => {
				if (!(result instanceof stream.Readable))
					return new FileNotFoundError(request); //todo: handle better
				//TODO BETTER ERROR HANDLING
				const pipe = result.pipe(createGunzip()).pipe(new XdrStreamReader());
				pipe.on('data', (singleXDRBuffer: Buffer) => {
					try {
						switch (request.meta.category) {
							case Category.results: {
								const hashMap =
									processTransactionHistoryResultEntryXDR(singleXDRBuffer);
								calculatedTxSetResultHashes.set(hashMap.ledger, hashMap.hash);

								break;
							}
							case Category.transactions: {
								const hashMap =
									processTransactionHistoryEntryXDR(singleXDRBuffer);
								calculatedTxSetHashes.set(hashMap.ledger, hashMap.hash);

								break;
							}
							case Category.ledger: {
								const ledgerHeaderResult =
									processLedgerHeaderHistoryEntryXDR(singleXDRBuffer);

								expectedHashesPerLedger.set(ledgerHeaderResult.ledger, {
									txSetResultHash: ledgerHeaderResult.transactionResultsHash,
									txSetHash: ledgerHeaderResult.transactionsHash,
									previousLedgerHeaderHash:
										ledgerHeaderResult.previousLedgerHeaderHash
								});
								ledgerHeaderHashes.set(
									ledgerHeaderResult.ledger,
									ledgerHeaderResult.ledgerHeaderHash
								);

								break;
							}
							default:
								break;
						}
					} catch (e) {
						console.log(e);
					}
				});
				pipe.on('end', () => {
					resolve(undefined);
				});
				pipe.on('error', (error: Error) => {
					reject(error);
				});
			});
		};

		const verifyResult = await this.httpQueue.sendRequests<CategoryRequestMeta>(
			RequestGenerator.generateCategoryRequests(
				checkPoints,
				baseUrl,
				RequestMethod.GET
			),
			{
				stallTimeMs: 150,
				concurrency: concurrency,
				nrOfRetries: 5,
				rampUpConnections: true,
				httpOptions: {
					httpAgent: httpAgent,
					httpsAgent: httpsAgent,
					responseType: 'stream',
					timeoutMs: 100000
				}
			},
			processRequestResult
		);

		if (verifyResult.isErr()) {
			return err(mapHttpQueueErrorToScanError(verifyResult.error, undefined));
		}

		console.log('verifying category files');
		let verificationError: CategoryVerificationError | null = null;
		for (const [ledger, expectedHashes] of expectedHashesPerLedger) {
			let calculatedTxSetHash = calculatedTxSetHashes.get(ledger);
			if (!calculatedTxSetHash) {
				if (ledger > 1) {
					//if there are no transactions for the ledger, the hash is equal to the previous ledger header hash
					const previousLedgerHashHashed = createHash('sha256');
					const previousLedgerHash = ledgerHeaderHashes.get(ledger - 1);
					if (previousLedgerHash) {
						previousLedgerHashHashed.update(
							Buffer.from(previousLedgerHash, 'base64')
						);
						calculatedTxSetHash = previousLedgerHashHashed.digest('base64');
					}
				} else calculatedTxSetHash = CategoryScanner.ZeroHash;
			}

			if (
				calculatedTxSetHash !== expectedHashes.txSetHash &&
				previousLedgerHeaderHash !== undefined
			) {
				verificationError = new CategoryVerificationError(
					ledger,
					Category.transactions
				);
			}

			let calculatedTxSetResultHash = calculatedTxSetResultHashes.get(ledger);
			if (!calculatedTxSetResultHash) {
				if (ledger > 1) calculatedTxSetResultHash = CategoryScanner.ZeroXdrHash;
				else calculatedTxSetResultHash = CategoryScanner.ZeroHash;
			}

			if (expectedHashes.txSetResultHash !== calculatedTxSetResultHash) {
				verificationError = new CategoryVerificationError(
					ledger,
					Category.results
				);
			}

			if (ledger > 1) {
				const previousLedgerHeaderHash = ledgerHeaderHashes.get(ledger - 1);
				if (
					previousLedgerHeaderHash &&
					expectedHashes.previousLedgerHeaderHash !== previousLedgerHeaderHash
				) {
					verificationError = new CategoryVerificationError(
						ledger,
						Category.ledger
					);
				}
			}

			if (verificationError) break;
		}

		if (verificationError) return err(verificationError);

		const maxLedger = getMaximumNumber([...ledgerHeaderHashes.keys()]);

		return ok({
			ledger: maxLedger,
			hash: ledgerHeaderHashes.get(maxLedger) as string
		});
	}

	private async otherCategoriesExist(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		const generateCategoryQueueUrls = RequestGenerator.generateCategoryRequests(
			checkPoints,
			baseUrl,
			RequestMethod.HEAD
		);

		const categoriesExistResult =
			await this.httpQueue.sendRequests<CategoryRequestMeta>(
				generateCategoryQueueUrls,
				{
					stallTimeMs: 150,
					concurrency: concurrency,
					nrOfRetries: 5,
					rampUpConnections: true,
					httpOptions: {
						responseType: undefined,
						timeoutMs: 10000,
						httpAgent: httpAgent,
						httpsAgent: httpsAgent
					}
				}
			);

		if (categoriesExistResult.isErr()) {
			return err(
				mapHttpQueueErrorToScanError(
					categoriesExistResult.error,
					categoriesExistResult.error.request.meta.checkPoint
				)
			);
		}

		return ok(undefined);
	}

	private async performInPool<Return>(
		data: Buffer,
		method:
			| 'processTransactionHistoryResultEntriesZip'
			| 'processTransactionHistoryEntriesZip'
			| 'processLedgerHeaderHistoryEntriesZip'
	): Promise<Return> {
		return new Promise((resolve, reject) => {
			this.pool
				.exec(method, [data])
				.then(function (map) {
					resolve(map);
				})
				.catch(function (err) {
					reject(err);
				});
		});
	}
}
