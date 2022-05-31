import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import { FileNotFoundError, HttpQueue } from '../HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';
import * as http from 'http';
import * as https from 'https';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { HttpError } from '../../../shared/services/HttpService';
import { UrlGenerator } from '../UrlGenerator';
import { BucketUrlMeta, CategoryUrlMeta } from '../UrlBuilder';
import { Url } from '../../../shared/domain/Url';
import { CustomError } from '../../../shared/errors/CustomError';

class GapFoundError extends CustomError {
	constructor(public url: Url, public checkPoint?: number) {
		super('Gap found', GapFoundError.name);
	}
}

class ScanError extends CustomError {
	constructor(
		public url: Url,
		cause: Error | undefined,
		public checkPoint?: number
	) {
		super('Error while scanning', ScanError.name, cause);
	}
}

@injectable()
export class HistoryArchiveScanner {
	static CHUNK_SIZE = 1000000;

	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async perform(
		historyArchiveScan: HistoryArchiveScan
	): Promise<Result<HistoryArchiveScan, Error>> {
		this.logger.info('Starting scan', {
			history: historyArchiveScan.baseUrl.value,
			toLedger: historyArchiveScan.toLedger,
			fromLedger: historyArchiveScan.fromLedger
		});

		const result = await this.scanInChunks(historyArchiveScan);
		console.timeEnd('scan');
		if (result.isErr()) {
			if (result.error instanceof GapFoundError) {
				historyArchiveScan.markGap(
					result.error.url,
					new Date(),
					result.error.checkPoint
				);
			} else {
				historyArchiveScan.markError(
					result.error.url,
					new Date(),
					result.error.cause
						? result.error.cause.message
						: result.error.message,
					result.error.cause instanceof HttpError
						? result.error.cause.response?.status
						: undefined,
					result.error.cause instanceof HttpError
						? result.error.cause.code
						: undefined
				);
			}
		} else {
			historyArchiveScan.markCompleted(new Date());
		}

		return ok(historyArchiveScan);
	}

	private async scanInChunks(
		historyArchiveScan: HistoryArchiveScan
	): Promise<Result<void, ScanError | GapFoundError>> {
		let currentFromLedger = historyArchiveScan.fromLedger;
		let currentToLedger =
			currentFromLedger + HistoryArchiveScanner.CHUNK_SIZE <
			historyArchiveScan.toLedger
				? currentFromLedger + HistoryArchiveScanner.CHUNK_SIZE
				: historyArchiveScan.toLedger;

		let result: Result<void, GapFoundError | ScanError> | null = null;
		let gapFound = false;

		while (
			currentFromLedger < historyArchiveScan.toLedger &&
			historyArchiveScan.concurrency > 0 &&
			!gapFound
		) {
			console.time('chunk');
			result = await this.scanChunk(
				historyArchiveScan,
				currentToLedger,
				currentFromLedger
			);
			console.timeEnd('chunk');

			if (result.isErr()) {
				this.logger.info(result.error.message, {
					cause: result.error.cause?.message,
					url: result.error.url,
					checkPoint: result.error.checkPoint
				});
				if (result.error instanceof FileNotFoundError) {
					gapFound = true;
				} else {
					historyArchiveScan.lowerConcurrency();
					await asyncSleep(5000); //let server cool off
				}
			} else {
				historyArchiveScan.latestScannedLedger = currentToLedger;
				currentFromLedger += HistoryArchiveScanner.CHUNK_SIZE;
				currentToLedger =
					currentFromLedger + HistoryArchiveScanner.CHUNK_SIZE <
					historyArchiveScan.toLedger
						? currentFromLedger + HistoryArchiveScanner.CHUNK_SIZE
						: historyArchiveScan.toLedger;
			}
		}

		if (!result) throw new Error('Invalid parameters for chunk scan'); //should not happen, todo: better code structure

		return result;
	}

	private async scanChunk(
		historyArchiveScan: HistoryArchiveScan,
		toLedger: number,
		fromLedger: number
	): Promise<Result<void, GapFoundError | ScanError>> {
		this.logger.info('Starting chunk scan', {
			history: historyArchiveScan.baseUrl.value,
			toLedger: toLedger,
			fromLedger: fromLedger,
			concurrency: historyArchiveScan.concurrency
		});

		const httpAgent = new http.Agent({
			keepAlive: true,
			maxSockets: historyArchiveScan.concurrency,
			maxFreeSockets: historyArchiveScan.concurrency,
			scheduling: 'fifo'
		});
		const httpsAgent = new https.Agent({
			keepAlive: true,
			maxSockets: historyArchiveScan.concurrency,
			maxFreeSockets: historyArchiveScan.concurrency,
			scheduling: 'fifo'
		});

		const historyArchive = new HistoryArchive(historyArchiveScan.baseUrl);

		const historyArchiveOrError = await this.scanHASFiles(
			historyArchive,
			historyArchiveScan.concurrency,
			fromLedger,
			toLedger,
			httpAgent,
			httpsAgent
		);
		if (historyArchiveOrError.isErr()) return historyArchiveOrError;

		const bucketScanResult = await this.scanBucketFiles(
			historyArchive,
			historyArchiveScan.concurrency,
			httpAgent,
			httpsAgent
		);
		if (bucketScanResult.isErr()) return bucketScanResult;

		const categoryScanResult = await this.scanCategories(
			historyArchiveScan.baseUrl,
			historyArchiveScan.concurrency,
			fromLedger,
			toLedger,
			httpAgent,
			httpsAgent
		);
		if (categoryScanResult.isErr()) return categoryScanResult;

		httpAgent.destroy();
		httpsAgent.destroy();

		return ok(undefined);
	}

	private async scanHASFiles(
		historyArchive: HistoryArchive,
		concurrency: number,
		fromLedger: number,
		toLedger: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		console.time('HAS');
		this.logger.info('Fetching history archive state (HAS) files');
		const historyArchiveStateURLGenerator = UrlGenerator.generateHASFetchUrls(
			historyArchive.baseUrl,
			this.checkPointGenerator.generate(fromLedger, toLedger)
		);

		const historyArchiveStateFilesResult = await this.httpQueue.get(
			historyArchiveStateURLGenerator,
			(result: Record<string, unknown>) => {
				const validateHASResult = this.hasValidator.validate(result);
				if (validateHASResult.isOk()) {
					historyArchive.addBucketHashes(validateHASResult.value);
				} else {
					return validateHASResult.error;
				}
			},
			concurrency,
			httpAgent,
			httpsAgent,
			true
		);

		console.timeEnd('HAS');

		if (historyArchiveStateFilesResult.isErr()) {
			const error = historyArchiveStateFilesResult.error;
			if (error instanceof FileNotFoundError) {
				return err(
					new GapFoundError(error.queueUrl.url, error.queueUrl.meta.checkPoint)
				);
			}
			return err(
				new ScanError(
					error.queueUrl.url,
					error.cause,
					error.queueUrl.meta.checkPoint
				)
			);
		}

		return ok(undefined);
	}

	private async scanBucketFiles(
		historyArchive: HistoryArchive,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		console.time('bucket');
		this.logger.info(
			'Checking if bucket files are present: ' +
				historyArchive.bucketHashes.length
		);

		const bucketsExistResult = await this.httpQueue.exists<BucketUrlMeta>(
			UrlGenerator.generateBucketQueueUrls(historyArchive),
			concurrency,
			httpAgent,
			httpsAgent
		);
		console.timeEnd('bucket');
		if (bucketsExistResult.isErr()) {
			const error = bucketsExistResult.error;
			if (error instanceof FileNotFoundError) {
				return err(new GapFoundError(error.queueUrl.url));
			}
			return err(new ScanError(error.queueUrl.url, error.cause));
		}

		return ok(undefined);
	}

	private async scanCategories(
		baseUrl: Url,
		concurrency: number,
		fromLedger: number,
		toLedger: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		console.time('category');
		this.logger.info('Checking if other category files are present');

		const generateCategoryQueueUrls = UrlGenerator.generateCategoryQueueUrls(
			this.checkPointGenerator.generate(fromLedger, toLedger),
			baseUrl
		);

		const categoriesExistResult = await this.httpQueue.exists<CategoryUrlMeta>(
			generateCategoryQueueUrls,
			concurrency,
			httpAgent,
			httpsAgent
		);
		console.timeEnd('category');
		if (categoriesExistResult.isErr()) {
			const error = categoriesExistResult.error;
			if (error instanceof FileNotFoundError) {
				return err(
					new GapFoundError(error.queueUrl.url, error.queueUrl.meta.checkPoint)
				);
			}
			return err(
				new ScanError(
					error.queueUrl.url,
					error.cause,
					error.queueUrl.meta.checkPoint
				)
			);
		}

		return ok(undefined);
	}
}
