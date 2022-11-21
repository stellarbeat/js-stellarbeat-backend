import * as stream from 'stream';
import * as os from 'os';
import { err, ok, Result } from 'neverthrow';
import { CategoryRequestMeta, RequestGenerator } from './RequestGenerator';
import {
	FileNotFoundError,
	HttpQueue,
	QueueError,
	Request,
	RequestMethod,
	RetryableQueueError
} from '../HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';
import { injectable } from 'inversify';
import { Url } from '../../../shared/domain/Url';
import { HASBucketHashExtractor } from '../history-archive/HASBucketHashExtractor';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';
import { isObject } from '../../../shared/utilities/TypeGuards';
import * as workerpool from 'workerpool';
import { WorkerPool } from 'workerpool';
import { Category } from '../history-archive/Category';
import { createHash } from 'crypto';
import { getMaximumNumber } from '../../../shared/utilities/getMaximumNumber';
import { createGunzip } from 'zlib';
import { XdrStreamReader } from './XdrStreamReader';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { pipeline } from 'stream/promises';
import { CategoryXDRProcessor } from './CategoryXDRProcessor';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { ScanError, ScanErrorType } from './ScanError';
import { UrlBuilder } from '../UrlBuilder';
import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { CategoryScanState } from './ScanState';
import { LedgerHeader } from './Scanner';
import * as https from 'https';
import * as http from 'http';
import { isZLibError } from '../../../shared/utilities/isZLibError';

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
	static POOL_MAX_PENDING_TASKS = 20000;

	constructor(
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue,
		private checkPointGenerator: CheckPointGenerator
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

	public async findLatestLedger(
		baseUrl: Url
	): Promise<Result<number, ScanError>> {
		const rootHASUrl = UrlBuilder.getRootHASUrl(baseUrl);
		const rootHASUrlRequest: Request[] = [
			{
				url: rootHASUrl,
				method: RequestMethod.GET,
				meta: {}
			}
		];

		let ledger: number | undefined;
		const httpAgent = new http.Agent();
		const httpsAgent = new https.Agent();
		const successOrError = await this.httpQueue.sendRequests(
			rootHASUrlRequest[Symbol.iterator](),
			{
				stallTimeMs: 150,
				concurrency: 1,
				nrOfRetries: 6, //last retry is after 1 min wait. 2 minute total wait time
				rampUpConnections: true,
				httpOptions: {
					httpAgent: httpAgent,
					httpsAgent: httpsAgent,
					responseType: 'json',
					socketTimeoutMs: 4000 //timeout to download file
				}
			},
			async (result: unknown, request) => {
				console.log(isObject(result));
				if (!isObject(result)) {
					return err(new FileNotFoundError(request));
				}
				const validateHASResult = this.hasValidator.validate(result);
				console.log(validateHASResult);
				if (validateHASResult.isOk()) {
					ledger = validateHASResult.value.currentLedger;
					console.log(ledger);
					return ok(undefined);
				} else {
					return err(new QueueError(request, validateHASResult.error));
				}
			}
		);
		httpAgent.destroy();
		httpsAgent.destroy();

		if (successOrError.isErr()) {
			return err(mapHttpQueueErrorToScanError(successOrError.error));
		}

		if (!ledger) {
			return err(
				new ScanError(
					ScanErrorType.TYPE_VERIFICATION,
					rootHASUrl.value,
					'No latest ledger found'
				)
			);
		}

		return ok(ledger);
	}

	//fetches all HAS files in checkpoint range and returns all detected bucket urls
	public async scanHASFilesAndReturnBucketHashes(
		scanState: CategoryScanState
	): Promise<Result<Set<string>, ScanError>> {
		const historyArchiveStateURLGenerator =
			RequestGenerator.generateHASRequests(
				scanState.baseUrl,
				scanState.checkPoints,
				RequestMethod.GET
			);

		const bucketHashes = new Set<string>();
		const successOrError = await this.httpQueue.sendRequests(
			historyArchiveStateURLGenerator,
			{
				stallTimeMs: 150,
				concurrency: scanState.concurrency,
				nrOfRetries: 6, //last retry is after 1 min wait. 2 minute total wait time
				rampUpConnections: true,
				httpOptions: {
					httpAgent: scanState.httpAgent,
					httpsAgent: scanState.httpsAgent,
					responseType: 'json',
					socketTimeoutMs: 4000 //timeout to download file
				}
			},
			async (result: unknown, request) => {
				if (!isObject(result)) {
					return err(new FileNotFoundError(request));
				}
				const validateHASResult = this.hasValidator.validate(result);
				if (validateHASResult.isOk()) {
					HASBucketHashExtractor.getNonZeroHashes(
						validateHASResult.value
					).forEach((hash) => bucketHashes.add(hash));
					return ok(undefined);
				} else {
					return err(new QueueError(request, validateHASResult.error));
				}
			}
		);

		if (successOrError.isErr()) {
			return err(mapHttpQueueErrorToScanError(successOrError.error));
		}

		return ok(bucketHashes);
	}

	async scanOtherCategories(
		scanState: CategoryScanState,
		verify = false
	): Promise<Result<LedgerHeader | undefined, ScanError>> {
		if (!verify) return await this.otherCategoriesExist(scanState);

		return await this.verifyOtherCategories(scanState);
	}

	private async verifyOtherCategories(
		scanState: CategoryScanState
	): Promise<Result<undefined | LedgerHeader, ScanError>> {
		const pool = CategoryScanner.createPool();
		let poolFullCount = 0;
		let poolCheckIfFullCount = 0;
		const statsLogger = setInterval(() => {
			poolCheckIfFullCount++;
			if (
				pool.workerpool.stats().pendingTasks >=
				CategoryScanner.POOL_MAX_PENDING_TASKS * 0.8
			)
				//pool 80 percent of max pending is considered full
				poolFullCount++;
		}, 10000);

		const categoryVerificationData: CategoryVerificationData = {
			calculatedTxSetHashes: new Map(),
			expectedHashesPerLedger: new Map(),
			calculatedTxSetResultHashes: new Map(),
			ledgerHeaderHashes: new Map()
		};
		if (scanState.previousLedgerHeader)
			categoryVerificationData.ledgerHeaderHashes.set(
				scanState.previousLedgerHeader.ledger,
				scanState.previousLedgerHeader.hash
			);

		const processRequestResult = async (
			readStream: unknown,
			request: Request<CategoryRequestMeta>
		): Promise<Result<void, QueueError>> => {
			if (!(readStream instanceof stream.Readable)) {
				return err(new FileNotFoundError(request));
			}
			//debugging, can be removed if no more pipeline issues
			const streamErrorListener = (error: unknown) =>
				console.log(
					'readstream error',
					mapUnknownToError(error).message,
					request.url.value
				);
			readStream.on('error', streamErrorListener);

			const xdrStreamReader = new XdrStreamReader();
			const gunzip = createGunzip();
			const categoryXDRProcessor = new CategoryXDRProcessor(
				pool,
				request.url,
				request.meta.category,
				categoryVerificationData
			);
			try {
				await pipeline([
					readStream,
					gunzip,
					xdrStreamReader,
					categoryXDRProcessor
				]);
				while (
					pool.workerpool.stats().pendingTasks >
					CategoryScanner.POOL_MAX_PENDING_TASKS
				) {
					await asyncSleep(10);
				}
				return ok(undefined);
			} catch (error) {
				if (isZLibError(error)) {
					return err(
						new RetryableQueueError(
							request,
							new ScanError(
								ScanErrorType.TYPE_VERIFICATION,
								request.url.value,
								error.message
							)
						)
					);
				} else {
					return err(
						new RetryableQueueError(request, mapUnknownToError(error))
					);
				}
			} finally {
				readStream.off('error', streamErrorListener);
			}
		};

		const verifyResult = await this.httpQueue.sendRequests(
			RequestGenerator.generateCategoryRequests(
				scanState.checkPoints,
				scanState.baseUrl,
				RequestMethod.GET
			),
			{
				stallTimeMs: 150,
				concurrency: scanState.concurrency,
				nrOfRetries: 6, //last retry is after 1 min wait. 2 minute total wait time
				rampUpConnections: true,
				httpOptions: {
					httpAgent: scanState.httpAgent,
					httpsAgent: scanState.httpsAgent,
					responseType: 'stream',
					socketTimeoutMs: 60000,
					connectionTimeoutMs: 10000
				}
			},
			processRequestResult
		);

		clearInterval(statsLogger);
		if (verifyResult.isErr()) {
			await CategoryScanner.terminatePool(pool);
			return err(mapHttpQueueErrorToScanError(verifyResult.error));
		}

		console.log(
			'Waiting until pool is finished',
			pool.workerpool.stats().activeTasks,
			pool.workerpool.stats().pendingTasks
		);
		while (
			pool.workerpool.stats().pendingTasks > 0 ||
			pool.workerpool.stats().activeTasks > 0
		) {
			await asyncSleep(500);
		}

		await CategoryScanner.terminatePool(pool);
		console.log('verifying category files');
		let verificationError: ScanError | null = null;
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
				scanState.previousLedgerHeader !== undefined
			) {
				verificationError = this.createVerificationError(
					scanState.baseUrl,
					ledger,
					Category.transactions,
					'Wrong transaction hash'
				);
			}

			let calculatedTxSetResultHash =
				categoryVerificationData.calculatedTxSetResultHashes.get(ledger);
			if (!calculatedTxSetResultHash) {
				if (ledger > 1) calculatedTxSetResultHash = CategoryScanner.ZeroXdrHash;
				else calculatedTxSetResultHash = CategoryScanner.ZeroHash;
			}

			if (expectedHashes.txSetResultHash !== calculatedTxSetResultHash) {
				verificationError = this.createVerificationError(
					scanState.baseUrl,
					ledger,
					Category.results,
					'Wrong results hash'
				);
			}

			if (ledger > 1) {
				const previousLedgerHeaderHash =
					categoryVerificationData.ledgerHeaderHashes.get(ledger - 1);
				if (
					previousLedgerHeaderHash &&
					expectedHashes.previousLedgerHeaderHash !== previousLedgerHeaderHash
				) {
					verificationError = this.createVerificationError(
						scanState.baseUrl,
						ledger,
						Category.ledger,
						'Wrong ledger hash'
					);
				}
			}

			if (verificationError) break;
		}

		if (verificationError) return err(verificationError);

		const maxLedger = getMaximumNumber([
			...categoryVerificationData.ledgerHeaderHashes.keys()
		]);

		console.log(
			'Pool full percentage',
			poolCheckIfFullCount > 0
				? Math.round((poolFullCount / poolCheckIfFullCount) * 100) + '%'
				: '0%'
		);
		return ok({
			ledger: maxLedger,
			hash: categoryVerificationData.ledgerHeaderHashes.get(maxLedger) as string
		});
	}

	private static async terminatePool(pool: HasherPool) {
		try {
			await pool.workerpool.terminate(true);
			pool.terminated = true;
		} catch (e) {
			//
		}
	}

	private async otherCategoriesExist(
		scanState: CategoryScanState
	): Promise<Result<undefined, ScanError>> {
		const generateCategoryQueueUrls = RequestGenerator.generateCategoryRequests(
			scanState.checkPoints,
			scanState.baseUrl,
			RequestMethod.HEAD
		);

		const categoriesExistResult = await this.httpQueue.sendRequests(
			generateCategoryQueueUrls,
			{
				stallTimeMs: 150,
				concurrency: scanState.concurrency,
				nrOfRetries: 5,
				rampUpConnections: true,
				httpOptions: {
					responseType: undefined,
					socketTimeoutMs: 10000,
					httpAgent: scanState.httpAgent,
					httpsAgent: scanState.httpsAgent
				}
			}
		);

		if (categoriesExistResult.isErr()) {
			return err(mapHttpQueueErrorToScanError(categoriesExistResult.error));
		}

		return ok(undefined);
	}

	private createVerificationError(
		baseUrl: Url,
		ledger: number,
		category: Category,
		message: string
	): ScanError {
		return new ScanError(
			ScanErrorType.TYPE_VERIFICATION,
			UrlBuilder.getCategoryUrl(
				baseUrl,
				this.checkPointGenerator.getClosestHigherCheckPoint(ledger),
				category
			).value,
			message
		);
	}
}
