import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import { FileNotFoundError, HttpQueue } from '../HttpQueue';
import * as http from 'http';
import * as https from 'https';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { HttpError } from '../../../shared/services/HttpService';
import { Url } from '../../../shared/domain/Url';
import { CustomError } from '../../../shared/errors/CustomError';
import { GapFoundError } from './GapFoundError';
import { CategoryScanner } from './CategoryScanner';
import { BucketScanner } from './BucketScanner';

export class ScanError extends CustomError {
	constructor(
		public url: Url,
		cause: Error | undefined,
		public checkPoint?: number
	) {
		super('Error while scanning', ScanError.name, cause);
	}
}

//todo: extract http agents and concurrency into HttpQueueOptions
@injectable()
export class HistoryArchiveScanner {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private categoryScanner: CategoryScanner,
		private bucketScanner: BucketScanner,
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
			currentFromLedger + historyArchiveScan.chunkSize <
			historyArchiveScan.toLedger
				? currentFromLedger + historyArchiveScan.chunkSize
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
					//todo: move down, this method should only handle the chunking. Then we can create a ChunkHistoryArchiveScanner, that calls the scan method of HistoryArchiveScanner (decoration)
					gapFound = true;
				} else {
					historyArchiveScan.lowerConcurrency();
					await asyncSleep(5000); //let server cool off
				}
			} else {
				historyArchiveScan.latestScannedLedger = currentToLedger;
				currentFromLedger += historyArchiveScan.chunkSize;
				currentToLedger =
					currentFromLedger + historyArchiveScan.chunkSize <
					historyArchiveScan.toLedger
						? currentFromLedger + historyArchiveScan.chunkSize
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

		const scanHasFilesResultOrError = await this.scanHASFiles(
			historyArchive,
			historyArchiveScan.concurrency,
			fromLedger,
			toLedger,
			httpAgent,
			httpsAgent
		);
		if (scanHasFilesResultOrError.isErr()) return scanHasFilesResultOrError;

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
		this.logger.info('Fetching history archive state (HAS) files');
		console.time('HAS');
		const scanHASResult =
			await this.categoryScanner.scanHASFilesAndReturnBucketHashes(
				historyArchive.baseUrl,
				this.checkPointGenerator.generate(fromLedger, toLedger),
				concurrency,
				httpAgent,
				httpsAgent
			);

		if (scanHASResult.isErr()) {
			return err(scanHASResult.error);
		}

		historyArchive.bucketHashes = scanHASResult.value;

		console.timeEnd('HAS');
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
				historyArchive.bucketHashes.size
		);

		const scanBucketsResult = await this.bucketScanner.scan(
			historyArchive,
			concurrency,
			httpAgent,
			httpsAgent,
			true
		);
		console.timeEnd('bucket');

		return scanBucketsResult;
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

		const scanOtherCategoriesResult =
			await this.categoryScanner.scanOtherCategories(
				baseUrl,
				concurrency,
				this.checkPointGenerator.generate(fromLedger, toLedger),
				httpAgent,
				httpsAgent
			);

		console.timeEnd('category');

		return scanOtherCategoriesResult;
	}
}
