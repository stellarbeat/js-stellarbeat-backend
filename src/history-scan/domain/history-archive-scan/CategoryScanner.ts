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
import { ScanError } from './HistoryArchiveScanner';
import { GapFoundError } from './GapFoundError';
import { HASBucketHashExtractor } from '../history-archive/HASBucketHashExtractor';
import * as http from 'http';
import * as https from 'https';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';
import { isObject } from '../../../shared/utilities/TypeGuards';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import * as workerpool from 'workerpool';
import { WorkerPool } from 'workerpool';
import { Category } from '../history-archive/Category';
import { VerificationError } from './VerificationError';
import { LedgerHeaderHistoryEntryProcessingResult } from './hash-worker';
import { createHash } from 'crypto';

type Ledger = number;
type Hash = string;

type ExpectedHashesPerLedger = Map<
	Ledger,
	{
		txSetHash: Hash;
		txSetResultHash: Hash;
		previousLedgerHash: Hash;
	}
>;
type ActualTxSetHashes = Map<Ledger, Hash>;
type ActualTxSetResultHashes = Map<Ledger, Hash>;
type ActualLedgerHashes = Map<Ledger, Hash>;

@injectable()
export class CategoryScanner {
	private pool: WorkerPool;

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
		verify = false
	): Promise<Result<void, GapFoundError | ScanError | VerificationError>> {
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
			httpsAgent
		);
	}

	private async verifyOtherCategories(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError | VerificationError>> {
		const actualTxSetHashes: ActualTxSetHashes = new Map();
		const expectedHashesPerLedger: ExpectedHashesPerLedger = new Map();
		const actualTxSetResultHashes: ActualTxSetResultHashes = new Map();
		const actualLedgerHashes: ActualLedgerHashes = new Map();

		const processRequestResult = async (
			result: unknown,
			request: Request<CategoryRequestMeta>
		): Promise<QueueError<CategoryRequestMeta> | undefined> => {
			if (!(result instanceof Buffer)) return new FileNotFoundError(request);
			try {
				switch (request.meta.category) {
					case Category.results:
						(
							await this.performInPool<Map<Ledger, string>>(
								result,
								'processTransactionHistoryResultEntriesZip'
							)
						).forEach((hash, ledger) =>
							actualTxSetResultHashes.set(ledger, hash)
						);
						break;
					case Category.transactions:
						(
							await this.performInPool<Map<Ledger, string>>(
								result,
								'processTransactionHistoryEntriesZip'
							)
						).forEach((hash, ledger) => actualTxSetHashes.set(ledger, hash));
						break;
					case Category.ledger:
						(
							await this.performInPool<LedgerHeaderHistoryEntryProcessingResult>(
								result,
								'processLedgerHeaderHistoryEntriesZip'
							)
						).forEach((result, ledger) => {
							expectedHashesPerLedger.set(ledger, {
								txSetResultHash: result.transactionResultsHash,
								txSetHash: result.transactionsHash,
								previousLedgerHash: result.previousLedgerHash
							});
							actualLedgerHashes.set(ledger, result.ledgerHash);
						});
						break;
					default:
						break;
				}
			} catch (e) {
				return new QueueError<CategoryRequestMeta>(
					request,
					mapUnknownToError(e)
				);
			}
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
					responseType: 'arraybuffer',
					timeoutMs: 10000
				}
			},
			processRequestResult
		);

		if (verifyResult.isErr()) {
			return err(mapHttpQueueErrorToScanError(verifyResult.error, undefined));
		}

		let verificationError: VerificationError | null = null;
		for (const [ledger, expectedHashes] of expectedHashesPerLedger) {
			let actualTxSetHash = actualTxSetHashes.get(ledger);
			if (!actualTxSetHash) {
				if (ledger > 1) {
					//if there are no transactions for the ledger, the hash is equal to the previous ledger header hash
					const previousLedgerHashHashed = createHash('sha256');
					const previousLedgerHash = actualLedgerHashes.get(ledger - 1);
					if (!previousLedgerHash)
						//should not happen
						throw new Error('Ledger hash missing for ledger: ' + (ledger - 1));
					console.log(previousLedgerHash);
					previousLedgerHashHashed.update(
						Buffer.from(previousLedgerHash, 'base64')
					);
					actualTxSetHash = previousLedgerHashHashed.digest('base64');
				} else actualTxSetHash = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
			}

			if (actualTxSetHash !== expectedHashes.txSetHash) {
				console.log(actualTxSetHash);
				console.log(expectedHashes.txSetHash);
				verificationError = new VerificationError(
					ledger,
					Category.transactions
				);
			}

			let actualTxSetResultHash = actualTxSetResultHashes.get(ledger);
			if (!actualTxSetResultHash) {
				if (ledger > 1)
					actualTxSetResultHash =
						'3z9hmASpL9tAVxktxD3XSOp3itxSvEmM6AUkwBS4ERk=';
				else
					actualTxSetResultHash =
						'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
			}

			if (expectedHashes.txSetResultHash !== actualTxSetResultHash) {
				verificationError = new VerificationError(
					ledger,
					Category.transactions
				);
			}

			if (ledger > 1) {
				const previousLedgerExpectedHashes = actualLedgerHashes.get(ledger - 1);
				if (
					!previousLedgerExpectedHashes ||
					expectedHashes.previousLedgerHash !== previousLedgerExpectedHashes
				) {
					verificationError = new VerificationError(ledger, Category.ledger);
				}
			}

			if (verificationError) break;
		}
		console.log(actualTxSetResultHashes);
		console.log(actualTxSetHashes);
		console.log(expectedHashesPerLedger);

		if (verificationError) return err(verificationError);
		return ok(undefined);
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
