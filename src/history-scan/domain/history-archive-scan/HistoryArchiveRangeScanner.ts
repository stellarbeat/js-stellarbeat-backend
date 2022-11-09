import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import { HttpQueue } from '../HttpQueue';
import * as http from 'http';
import * as https from 'https';
import { Url } from '../../../shared/domain/Url';
import { CustomError } from '../../../shared/errors/CustomError';
import { GapFoundError } from './GapFoundError';
import { CategoryScanner } from './CategoryScanner';
import { BucketScanner } from './BucketScanner';
import { CategoryVerificationError } from './CategoryVerificationError';

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

/**
 * Scan a specific range of a history archive
 */
@injectable()
export class HistoryArchiveRangeScanner {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private categoryScanner: CategoryScanner,
		private bucketScanner: BucketScanner,
		private httpQueue: HttpQueue,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async scan(
		baseUrl: Url,
		concurrency: number,
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
		this.logger.info('Starting range scan', {
			history: baseUrl.value,
			toLedger: toLedger,
			fromLedger: fromLedger,
			concurrency: concurrency
		});

		const httpAgent = new http.Agent({
			keepAlive: true,
			maxSockets: concurrency,
			maxFreeSockets: concurrency,
			scheduling: 'fifo'
		});
		const httpsAgent = new https.Agent({
			keepAlive: true,
			maxSockets: concurrency,
			maxFreeSockets: concurrency,
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
		maxConcurrency: number,
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
				maxConcurrency,
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
		maxConcurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		console.time('bucket');
		this.logger.info(`Scanning ${historyArchive.bucketHashes.size} buckets`);

		const scanBucketsResult = await this.bucketScanner.scan(
			historyArchive,
			maxConcurrency < 50 ? maxConcurrency : 50, //because files can get very large and to avoid hitting http timeouts
			httpAgent,
			httpsAgent,
			true
		);
		console.timeEnd('bucket');

		return scanBucketsResult;
	}

	private async scanCategories(
		baseUrl: Url,
		maxConcurrency: number,
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
				maxConcurrency,
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
