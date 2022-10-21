import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import { HttpQueue } from '../HttpQueue';
import * as http from 'http';
import * as https from 'https';
import { HttpError } from '../../../shared/services/HttpService';
import { Url } from '../../../shared/domain/Url';
import { CustomError } from '../../../shared/errors/CustomError';
import { GapFoundError } from './GapFoundError';
import { CategoryScanner } from './CategoryScanner';
import { BucketScanner } from './BucketScanner';
import { CategoryVerificationError } from './CategoryVerificationError';
import { UrlBuilder } from '../UrlBuilder';
import {
	HistoryArchivePerformanceTester,
	OptimalConcurrency
} from './HistoryArchivePerformanceTester';

export interface LedgerHeaderHash {
	ledger: number;
	hash: string;
}

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
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger,
		private performanceTester: HistoryArchivePerformanceTester
	) {}

	async perform(
		historyArchiveScan: HistoryArchiveScan
	): Promise<Result<HistoryArchiveScan, Error>> {
		this.logger.info('Starting scan', {
			history: historyArchiveScan.baseUrl.value,
			toLedger: historyArchiveScan.toLedger,
			fromLedger: historyArchiveScan.fromLedger
		});
		this.logger.info('Checking archive speed');
		const smallFilesConcurrencyOrError = await this.getSmallFilesConcurrency(
			historyArchiveScan
		);
		if (smallFilesConcurrencyOrError.isErr()) {
			return err(smallFilesConcurrencyOrError.error);
		}

		if (smallFilesConcurrencyOrError.value.concurrency === Infinity) {
			historyArchiveScan.markError(
				historyArchiveScan.baseUrl,
				new Date(),
				'No concurrency option completed without errors'
			);
			return ok(historyArchiveScan);
		}
		if (smallFilesConcurrencyOrError.value.timeMsPerFile > 100) {
			historyArchiveScan.markError(
				historyArchiveScan.baseUrl,
				new Date(),
				`History archive too slow, ${smallFilesConcurrencyOrError.value.timeMsPerFile} ms per HAS file download`
			);
			return ok(historyArchiveScan);
		}
		const concurrency = {
			smallFilesConcurrency: smallFilesConcurrencyOrError.value.concurrency,
			largeFilesConcurrency: HistoryArchiveScanner.getLargeFilesConcurrency(
				smallFilesConcurrencyOrError.value.concurrency
			) //could also be done with performanceTester, but let's see how it goes first
		};
		console.time('scan');
		const result = await this.scanInChunks(historyArchiveScan, concurrency);
		console.timeEnd('scan');
		if (result.isErr()) {
			if (result.error instanceof CategoryVerificationError) {
				this.logger.info(result.error.message, {
					ledger: result.error.ledger,
					category: result.error.category
				});
				console.log(
					UrlBuilder.getCategoryUrl(
						historyArchiveScan.baseUrl,
						this.checkPointGenerator.getClosestHigherCheckPoint(
							result.error.ledger
						),
						result.error.category
					)
				);
			}
			if (result.error instanceof GapFoundError) {
				this.logger.info(result.error.message, {
					url: result.error.url,
					checkPoint: result.error.checkPoint
				});
				historyArchiveScan.markGap(
					result.error.url,
					new Date(),
					result.error.checkPoint
				);
			} else if (result.error instanceof ScanError) {
				this.logger.info(result.error.message, {
					cause: result.error.cause?.message,
					url: result.error.url,
					checkPoint: result.error.checkPoint
				});
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

	private async getSmallFilesConcurrency(
		historyArchiveScan: HistoryArchiveScan
	): Promise<Result<OptimalConcurrency, Error>> {
		const result = await this.performanceTester.determineOptimalConcurrency(
			historyArchiveScan.baseUrl,
			historyArchiveScan.toLedger,
			false
		);

		return result;
	}

	private static getLargeFilesConcurrency(
		smallFilesConcurrency: number
	): number {
		const maxLargeFilesConcurrency = 50; //todo: config
		if (smallFilesConcurrency < maxLargeFilesConcurrency)
			return smallFilesConcurrency;

		return maxLargeFilesConcurrency;
	}

	private async scanInChunks(
		historyArchiveScan: HistoryArchiveScan,
		concurrency: {
			smallFilesConcurrency: number;
			largeFilesConcurrency: number;
		}
	): Promise<
		Result<
			LedgerHeaderHash | void,
			ScanError | GapFoundError | CategoryVerificationError
		>
	> {
		let currentFromLedger = historyArchiveScan.fromLedger;
		let currentToLedger =
			currentFromLedger + historyArchiveScan.chunkSize <
			historyArchiveScan.toLedger
				? currentFromLedger + historyArchiveScan.chunkSize
				: historyArchiveScan.toLedger;

		let result: Result<
			LedgerHeaderHash | void,
			GapFoundError | ScanError | CategoryVerificationError
		> | null = null;
		let errorFound = false;

		while (currentFromLedger < historyArchiveScan.toLedger && !errorFound) {
			console.time('chunk');
			result = await this.scanChunk(
				historyArchiveScan.baseUrl,
				concurrency,
				currentToLedger,
				currentFromLedger,
				historyArchiveScan.latestScannedLedger,
				historyArchiveScan.latestScannedLedgerHeaderHash
			);
			console.timeEnd('chunk');

			if (result.isErr()) {
				errorFound = true;
				//historyArchiveScan.lowerConcurrency();
				//await asyncSleep(5000); //let server cool off
			} else {
				if (result.value !== undefined) {
					historyArchiveScan.latestScannedLedger = result.value.ledger;
					historyArchiveScan.latestScannedLedgerHeaderHash = result.value.hash;
				} else historyArchiveScan.latestScannedLedger = currentToLedger;
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
		baseUrl: Url,
		concurrency: {
			smallFilesConcurrency: number;
			largeFilesConcurrency: number;
		},
		toLedger: number,
		fromLedger: number,
		latestScannedLedger: number,
		latestScannedLedgerHeaderHash?: string
	): Promise<
		Result<
			LedgerHeaderHash | void,
			GapFoundError | ScanError | CategoryVerificationError
		>
	> {
		this.logger.info('Starting chunk scan', {
			history: baseUrl.value,
			toLedger: toLedger,
			fromLedger: fromLedger
		});

		const httpAgent = new http.Agent({
			keepAlive: true,
			maxSockets: concurrency.smallFilesConcurrency,
			maxFreeSockets: concurrency.smallFilesConcurrency,
			scheduling: 'fifo'
		});
		const httpsAgent = new https.Agent({
			keepAlive: true,
			maxSockets: concurrency.smallFilesConcurrency,
			maxFreeSockets: concurrency.smallFilesConcurrency,
			scheduling: 'fifo'
		});

		const historyArchive = new HistoryArchive(baseUrl);

		const scanHasFilesResultOrError = await this.scanHASFiles(
			historyArchive,
			concurrency,
			fromLedger,
			toLedger,
			httpAgent,
			httpsAgent
		);
		if (scanHasFilesResultOrError.isErr()) return scanHasFilesResultOrError;

		const bucketScanResult = await this.scanBucketFiles(
			historyArchive,
			concurrency,
			httpAgent,
			httpsAgent
		);
		if (bucketScanResult.isErr()) return bucketScanResult;

		const categoryScanResult = await this.scanCategories(
			baseUrl,
			concurrency,
			fromLedger,
			toLedger,
			httpAgent,
			httpsAgent,
			latestScannedLedgerHeaderHash
				? {
						ledger: latestScannedLedger,
						hash: latestScannedLedgerHeaderHash
				  }
				: undefined
		);
		if (categoryScanResult.isErr()) return err(categoryScanResult.error);

		httpAgent.destroy();
		httpsAgent.destroy();

		return ok(categoryScanResult.value);
	}

	private async scanHASFiles(
		historyArchive: HistoryArchive,
		concurrency: {
			smallFilesConcurrency: number;
			largeFilesConcurrency: number;
		},
		fromLedger: number,
		toLedger: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		this.logger.info('Scanning HAS files');
		console.time('HAS');
		const scanHASResult =
			await this.categoryScanner.scanHASFilesAndReturnBucketHashes(
				historyArchive.baseUrl,
				this.checkPointGenerator.generate(fromLedger, toLedger),
				concurrency.smallFilesConcurrency,
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
		concurrency: {
			smallFilesConcurrency: number;
			largeFilesConcurrency: number;
		},
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		console.time('bucket');
		this.logger.info(`Scanning ${historyArchive.bucketHashes.size} buckets`);

		const scanBucketsResult = await this.bucketScanner.scan(
			historyArchive,
			concurrency.largeFilesConcurrency,
			httpAgent,
			httpsAgent,
			true
		);
		console.timeEnd('bucket');

		return scanBucketsResult;
	}

	private async scanCategories(
		baseUrl: Url,
		concurrency: {
			smallFilesConcurrency: number;
			largeFilesConcurrency: number;
		},
		fromLedger: number,
		toLedger: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		previousLedgerHeaderHash?: LedgerHeaderHash
	): Promise<
		Result<
			LedgerHeaderHash | void,
			GapFoundError | ScanError | CategoryVerificationError
		>
	> {
		console.time('category');
		this.logger.info('Scanning other category files');

		const scanOtherCategoriesResult =
			await this.categoryScanner.scanOtherCategories(
				baseUrl,
				concurrency.largeFilesConcurrency,
				this.checkPointGenerator.generate(fromLedger, toLedger),
				httpAgent,
				httpsAgent,
				true,
				previousLedgerHeaderHash
			);

		console.timeEnd('category');

		return scanOtherCategoriesResult;
	}
}
