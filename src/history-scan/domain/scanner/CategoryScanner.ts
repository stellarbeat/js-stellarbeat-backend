import * as stream from 'stream';
import { err, ok, Result } from 'neverthrow';
import { CategoryRequestMeta, RequestGenerator } from './RequestGenerator';
import {
	FileNotFoundError,
	HttpQueue,
	QueueError,
	Request,
	RequestMethod,
	RetryableQueueError
} from '../../../core/services/HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';
import { injectable } from 'inversify';
import { Url } from '../../../core/domain/Url';
import { HASBucketHashExtractor } from '../history-archive/HASBucketHashExtractor';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';
import { isObject } from '../../../core/utilities/TypeGuards';
import { Category } from '../history-archive/Category';
import { createGunzip } from 'zlib';
import { XdrStreamReader } from './XdrStreamReader';
import { asyncSleep } from '../../../core/utilities/asyncSleep';
import { pipeline } from 'stream/promises';
import { CategoryXDRProcessor } from './CategoryXDRProcessor';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { ScanError, ScanErrorType } from '../scan/ScanError';
import { UrlBuilder } from '../history-archive/UrlBuilder';
import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { CategoryScanState } from './ScanState';
import { LedgerHeader } from './Scanner';
import { isZLibError } from '../../../core/utilities/isZLibError';
import { hashBucketList } from '../history-archive/hashBucketList';
import { WorkerPoolLoadTracker } from './WorkerPoolLoadTracker';
import { CategoryVerificationService } from './CategoryVerificationService';
import { getMaximumNumber } from '../../../core/utilities/getMaximumNumber';
import { HasherPool } from './HasherPool';

type Ledger = number;
type Hash = string;

export type ExpectedHashes = {
	txSetHash: Hash;
	txSetResultHash: Hash;
	previousLedgerHeaderHash: Hash;
	bucketListHash: Hash;
};
export type ExpectedHashesPerLedger = Map<Ledger, ExpectedHashes>;
export type CalculatedTxSetHashes = Map<Ledger, Hash>;
export type CalculatedTxSetResultHashes = Map<Ledger, Hash>;
export type LedgerHeaderHashes = Map<Ledger, Hash | undefined>;

export interface CategoryVerificationData {
	calculatedTxSetHashes: CalculatedTxSetHashes;
	expectedHashesPerLedger: ExpectedHashesPerLedger;
	calculatedTxSetResultHashes: CalculatedTxSetResultHashes;
	calculatedLedgerHeaderHashes: LedgerHeaderHashes;
	protocolVersions: Map<number, number>;
}

@injectable()
export class CategoryScanner {
	static ZeroXdrHash = '3z9hmASpL9tAVxktxD3XSOp3itxSvEmM6AUkwBS4ERk=';
	static ZeroHash = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
	static POOL_MAX_PENDING_TASKS = 20000;

	constructor(
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue,
		private checkPointGenerator: CheckPointGenerator,
		private categoryVerificationService: CategoryVerificationService
	) {}

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
		const successOrError = await this.httpQueue.sendRequests(
			rootHASUrlRequest[Symbol.iterator](),
			{
				stallTimeMs: 150,
				concurrency: 1,
				nrOfRetries: 6, //last retry is after 1 min wait. 2 minute total wait time
				rampUpConnections: true,
				httpOptions: {
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
					ledger = validateHASResult.value.currentLedger;
					return ok(undefined);
				} else {
					return err(new QueueError(request, validateHASResult.error));
				}
			}
		);

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
		scanState: CategoryScanState,
		verify = true
	): Promise<
		Result<
			{
				bucketHashes: Set<string>;
				bucketListHashes: Map<number, string>;
			},
			ScanError
		>
	> {
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
					if (verify) {
						const bucketListHashResult = hashBucketList(
							validateHASResult.value
						);
						if (bucketListHashResult.isOk())
							scanState.bucketListHashes.set(
								bucketListHashResult.value.ledger,
								bucketListHashResult.value.hash
							);
					}
					return ok(undefined);
				} else {
					return err(new QueueError(request, validateHASResult.error));
				}
			}
		);

		if (successOrError.isErr()) {
			return err(mapHttpQueueErrorToScanError(successOrError.error));
		}

		return ok({
			bucketHashes: bucketHashes,
			bucketListHashes: scanState.bucketListHashes
		});
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
		const pool = new HasherPool();
		const poolLoadTracker = new WorkerPoolLoadTracker(
			pool,
			CategoryScanner.POOL_MAX_PENDING_TASKS
		);

		const categoryVerificationData: CategoryVerificationData = {
			calculatedTxSetHashes: new Map(),
			expectedHashesPerLedger: new Map(),
			calculatedTxSetResultHashes: new Map(),
			calculatedLedgerHeaderHashes: new Map(),
			protocolVersions: new Map()
		};

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

		await CategoryScanner.terminatePool(poolLoadTracker, pool);

		if (verifyResult.isErr()) {
			return err(mapHttpQueueErrorToScanError(verifyResult.error));
		}

		const verificationResult = this.categoryVerificationService.verify(
			categoryVerificationData,
			scanState.bucketListHashes,
			this.checkPointGenerator.checkPointFrequency,
			scanState.previousLedgerHeader
		);

		if (verificationResult.isErr())
			return err(
				this.createVerificationError(
					scanState.baseUrl,
					verificationResult.error.ledger,
					verificationResult.error.category,
					verificationResult.error.message
				)
			);

		const maxLedger = getMaximumNumber([
			...categoryVerificationData.calculatedLedgerHeaderHashes.keys()
		]);

		if (poolLoadTracker.getPoolFullPercentage() > 50) {
			console.log(
				'Pool full percentage',
				poolLoadTracker.getPoolFullPercentagePretty()
			);
		}

		return ok({
			ledger: maxLedger,
			hash: categoryVerificationData.calculatedLedgerHeaderHashes.get(
				maxLedger
			) as string
		});
	}

	private static async terminatePool(
		poolLoadTracker: WorkerPoolLoadTracker,
		pool: HasherPool
	) {
		try {
			poolLoadTracker.stop();
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
