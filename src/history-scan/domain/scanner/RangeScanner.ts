import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../core/services/PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { BucketScanState, CategoryScanState } from './ScanState';
import { HttpQueue } from '../../../core/services/HttpQueue';
import * as http from 'http';
import * as https from 'https';
import { Url } from '../../../core/domain/Url';
import { CategoryScanner } from './CategoryScanner';
import { BucketScanner } from './BucketScanner';
import { ScanError } from '../scan/ScanError';
import { LedgerHeader } from './Scanner';

export interface RangeScanResult {
	latestLedgerHeader?: LedgerHeader;
	scannedBucketHashes: Set<string>;
}
/**
 * Scan a specific range of a history archive
 */
@injectable()
export class RangeScanner {
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
		latestScannedLedgerHeaderHash: string | null = null,
		alreadyScannedBucketHashes: Set<string> = new Set()
	): Promise<Result<RangeScanResult, ScanError>> {
		this.logger.info('Starting range scan', {
			history: baseUrl.value,
			toLedger: toLedger,
			fromLedger: fromLedger,
			concurrency: concurrency
		});

		const httpAgent = new http.Agent({
			keepAlive: true,
			scheduling: 'fifo'
		});
		const httpsAgent = new https.Agent({
			keepAlive: true,
			scheduling: 'fifo'
		});

		const hasScanState = new CategoryScanState(
			baseUrl,
			concurrency,
			httpAgent,
			httpsAgent,
			this.checkPointGenerator.generate(fromLedger, toLedger),
			new Map<number, string>(),
			latestScannedLedgerHeaderHash !== null
				? {
						ledger: latestScannedLedger,
						hash: latestScannedLedgerHeaderHash
				  }
				: undefined
		);

		const bucketHashesOrError = await this.scanHASFilesAndReturnBucketHashes(
			hasScanState
		);
		if (bucketHashesOrError.isErr()) return err(bucketHashesOrError.error);
		const bucketHashesToScan = bucketHashesOrError.value.bucketHashes;

		const categoryScanState = new CategoryScanState(
			baseUrl,
			concurrency,
			httpAgent,
			httpsAgent,
			this.checkPointGenerator.generate(fromLedger, toLedger),
			bucketHashesOrError.value.bucketListHashes,
			latestScannedLedgerHeaderHash
				? {
						ledger: latestScannedLedger,
						hash: latestScannedLedgerHeaderHash
				  }
				: undefined
		);
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
			latestLedgerHeader: categoryScanResult.value,
			scannedBucketHashes: new Set([
				...bucketScanState.bucketHashesToScan,
				...alreadyScannedBucketHashes
			])
		});
	}

	private async scanHASFilesAndReturnBucketHashes(
		scanState: CategoryScanState
	): Promise<
		Result<
			{
				bucketHashes: Set<string>;
				bucketListHashes: Map<number, string>;
			},
			ScanError
		>
	> {
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
	): Promise<Result<LedgerHeader | undefined, ScanError>> {
		console.time('category');
		this.logger.info('Scanning other category files');

		const scanOtherCategoriesResult =
			await this.categoryScanner.scanOtherCategories(scanState, true);

		console.timeEnd('category');

		return scanOtherCategoriesResult;
	}
}
