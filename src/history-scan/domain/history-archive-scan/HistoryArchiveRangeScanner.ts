import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { BucketScanState, CategoryScanState } from './ScanState';
import { HttpQueue } from '../HttpQueue';
import * as http from 'http';
import * as https from 'https';
import { Url } from '../../../shared/domain/Url';
import { CategoryScanner } from './CategoryScanner';
import { BucketScanner } from './BucketScanner';
import { ScanError } from './ScanError';

export interface LedgerHeaderHash {
	ledger: number;
	hash: string;
}

export interface ScanResult {
	latestLedgerHeaderHash?: LedgerHeaderHash;
	scannedBucketHashes: Set<string>;
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
		latestScannedLedgerHeaderHash?: string,
		alreadyScannedBucketHashes: Set<string> = new Set()
	): Promise<Result<ScanResult, ScanError>> {
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

		const categoryScanState = new CategoryScanState(
			baseUrl,
			concurrency,
			httpAgent,
			httpsAgent,
			this.checkPointGenerator.generate(fromLedger, toLedger),
			latestScannedLedgerHeaderHash
				? {
						ledger: latestScannedLedger,
						hash: latestScannedLedgerHeaderHash
				  }
				: undefined
		);

		const bucketHashesOrError = await this.scanHASFilesAndReturnBucketHashes(
			categoryScanState
		);
		if (bucketHashesOrError.isErr()) return err(bucketHashesOrError.error);
		const bucketHashesToScan = bucketHashesOrError.value;

		const categoryScanResult = await this.scanCategories(categoryScanState);
		if (categoryScanResult.isErr()) return err(categoryScanResult.error);

		const bucketScanState = new BucketScanState(
			baseUrl,
			concurrency,
			httpAgent,
			httpsAgent,
			new Set(
				Array.from(bucketHashesToScan).filter(
					(hashToScan) => !alreadyScannedBucketHashes.has(hashToScan)
				)
			)
		);

		const bucketScanResult = await this.scanBucketFiles(bucketScanState);
		if (bucketScanResult.isErr()) return err(bucketScanResult.error);

		httpAgent.destroy();
		httpsAgent.destroy();

		return ok({
			latestLedgerHeaderHash: categoryScanResult.value,
			scannedBucketHashes: new Set([
				...bucketScanState.bucketHashesToScan,
				...alreadyScannedBucketHashes
			])
		});
	}

	private async scanHASFilesAndReturnBucketHashes(
		scanState: CategoryScanState
	): Promise<Result<Set<string>, ScanError>> {
		this.logger.info('Scanning HAS files');
		console.time('HAS');

		const scanHASResult =
			await this.categoryScanner.scanHASFilesAndReturnBucketHashes(scanState);

		if (scanHASResult.isErr()) {
			return err(scanHASResult.error);
		}

		console.timeEnd('HAS');

		return ok(scanHASResult.value);
	}

	private async scanBucketFiles(
		scanState: BucketScanState
	): Promise<Result<void, ScanError>> {
		console.time('bucket');
		this.logger.info(`Scanning ${scanState.bucketHashesToScan.size} buckets`);

		const scanBucketsResult = await this.bucketScanner.scan(scanState, true);
		console.timeEnd('bucket');

		return scanBucketsResult;
	}

	private async scanCategories(
		scanState: CategoryScanState
	): Promise<Result<LedgerHeaderHash | undefined, ScanError>> {
		console.time('category');
		this.logger.info('Scanning other category files');

		const scanOtherCategoriesResult =
			await this.categoryScanner.scanOtherCategories(scanState, true);

		console.timeEnd('category');

		return scanOtherCategoriesResult;
	}
}
