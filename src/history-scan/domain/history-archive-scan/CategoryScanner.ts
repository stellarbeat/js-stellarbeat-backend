import * as stream from 'stream';
import * as os from 'os';
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
import { Category } from '../history-archive/Category';
import { CategoryVerificationError } from './CategoryVerificationError';
import { createHash } from 'crypto';
import { getMaximumNumber } from '../../../shared/utilities/getMaximumNumber';
import { createGunzip } from 'zlib';
import { XdrStreamReader } from './XdrStreamReader';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { pipeline } from 'stream/promises';
import { CategoryXDRProcessor } from './CategoryXDRProcessor';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { WorkerPool } from 'workerpool';

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

export interface CategoryVerificationData {
	calculatedTxSetHashes: CalculatedTxSetHashes;
	expectedHashesPerLedger: ExpectedHashesPerLedger;
	calculatedTxSetResultHashes: CalculatedTxSetResultHashes;
	ledgerHeaderHashes: LedgerHeaderHashes;
}
export interface HasherPool {
	terminated: boolean;
	workerpool: WorkerPool;
}
@injectable()
export class CategoryScanner {
	static ZeroXdrHash = '3z9hmASpL9tAVxktxD3XSOp3itxSvEmM6AUkwBS4ERk=';
	static ZeroHash = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

	constructor(
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue
	) {}

	private static createPool(): HasherPool {
		try {
			require(__dirname + '/hash-worker.import.js');
			return {
				workerpool: workerpool.pool(__dirname + '/hash-worker.import.js', {
					minWorkers: Math.max((os.cpus().length || 4) - 1, 1)
				}),
				terminated: false
			};
		} catch (e) {
			return {
				workerpool: workerpool.pool(__dirname + '/hash-worker.js'),
				terminated: false
			};
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
				nrOfRetries: 7,
				rampUpConnections: true,
				httpOptions: {
					httpAgent: httpAgent,
					httpsAgent: httpsAgent,
					responseType: 'json',
					timeoutMs: 2000
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
		const pool = CategoryScanner.createPool();
		const statsLogger = setInterval(() => {
			console.log(pool.workerpool.stats());
		}, 10000);

		const categoryVerificationData: CategoryVerificationData = {
			calculatedTxSetHashes: new Map(),
			expectedHashesPerLedger: new Map(),
			calculatedTxSetResultHashes: new Map(),
			ledgerHeaderHashes: new Map()
		};
		if (previousLedgerHeaderHash)
			categoryVerificationData.ledgerHeaderHashes.set(
				previousLedgerHeaderHash.ledger,
				previousLedgerHeaderHash.hash
			);
		let counter = 0;
		const processRequestResult = async (
			readStream: unknown,
			request: Request<CategoryRequestMeta>
		): Promise<QueueError<CategoryRequestMeta> | undefined> => {
			if (!(readStream instanceof stream.Readable)) {
				return new FileNotFoundError(request);
			}

			counter++;
			if (counter === 100) {
				return new FileNotFoundError(request);
			}

			const categoryXDRProcessor = new CategoryXDRProcessor(
				pool,
				request.url,
				request.meta.category,
				categoryVerificationData
			);

			try {
				await pipeline([
					readStream,
					createGunzip(),
					new XdrStreamReader(),
					categoryXDRProcessor
				]);
			} catch (err) {
				if (!readStream.destroyed) {
					readStream.destroy(); //why doesn't the readstream get destroyed when there is an error later in the pipe?
					//could be better handled with still experimental stream.compose
				}

				return new QueueError<CategoryRequestMeta>(
					request,
					mapUnknownToError(err)
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
				nrOfRetries: 7,
				rampUpConnections: true,
				httpOptions: {
					httpAgent: httpAgent,
					httpsAgent: httpsAgent,
					responseType: 'stream',
					timeoutMs: 1000000 //todo: should depend on max filesize and concurrency
				}
			},
			processRequestResult
		);

		clearInterval(statsLogger);
		if (verifyResult.isErr()) {
			await this.terminatePool(pool);
			return err(mapHttpQueueErrorToScanError(verifyResult.error, undefined));
		}

		while (
			pool.workerpool.stats().pendingTasks > 0 ||
			pool.workerpool.stats().activeTasks > 0
		) {
			console.log(pool.workerpool.stats());
			await asyncSleep(2000);
		}

		await this.terminatePool(pool);
		console.log('verifying category files');
		let verificationError: CategoryVerificationError | null = null;
		for (const [
			ledger,
			expectedHashes
		] of categoryVerificationData.expectedHashesPerLedger) {
			let calculatedTxSetHash =
				categoryVerificationData.calculatedTxSetHashes.get(ledger);
			if (!calculatedTxSetHash) {
				if (ledger > 1) {
					//if there are no transactions for the ledger, the hash is equal to the previous ledger header hash
					const previousLedgerHashHashed = createHash('sha256');
					const previousLedgerHash =
						categoryVerificationData.ledgerHeaderHashes.get(ledger - 1);
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

			let calculatedTxSetResultHash =
				categoryVerificationData.calculatedTxSetResultHashes.get(ledger);
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
				const previousLedgerHeaderHash =
					categoryVerificationData.ledgerHeaderHashes.get(ledger - 1);
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

		const maxLedger = getMaximumNumber([
			...categoryVerificationData.ledgerHeaderHashes.keys()
		]);

		return ok({
			ledger: maxLedger,
			hash: categoryVerificationData.ledgerHeaderHashes.get(maxLedger) as string
		});
	}
	private async terminatePool(pool: HasherPool) {
		try {
			await pool.workerpool.terminate(true);
			pool.terminated = true;
		} catch (e) {
			//
		}
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
					nrOfRetries: 7,
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
}
