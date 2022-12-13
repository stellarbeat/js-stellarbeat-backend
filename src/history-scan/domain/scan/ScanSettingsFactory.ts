import { ScanError, ScanErrorType } from './ScanError';
import { injectable } from 'inversify';
import { ScanJob } from './ScanJob';
import { err, ok, Result } from 'neverthrow';
import { CategoryScanner } from '../scanner/CategoryScanner';
import { ArchivePerformanceTester } from '../scanner/ArchivePerformanceTester';
import { ScanSettings } from './ScanSettings';

@injectable()
export class ScanSettingsFactory {
	constructor(
		private categoryScanner: CategoryScanner,
		private archivePerformanceTester: ArchivePerformanceTester,
		private slowArchiveMaxNumberOfLedgersToScan = 120960 //by default only scan the latest week worth of ledgers for slow archives (5sec ledger close time)
	) {}

	async determineSettings(
		scanJob: ScanJob
	): Promise<Result<ScanSettings, ScanError>> {
		const toLedgerResult = await this.determineToLedger(scanJob);
		if (toLedgerResult.isErr()) {
			return err(toLedgerResult.error);
		}
		const toLedger = toLedgerResult.value;

		const concurrencyResult = await this.determineConcurrencyAndSlowArchive(
			scanJob,
			toLedger
		);

		if (concurrencyResult.isErr()) {
			return err(concurrencyResult.error);
		}

		const concurrency = concurrencyResult.value.concurrency;
		const isSlowArchive = concurrencyResult.value.isSlowArchive;

		const fromLedger = this.determineFromLedger(
			scanJob,
			toLedger,
			isSlowArchive
		);

		const latestLedgerHeader = this.determineLatestLedgerHeader(
			scanJob,
			toLedger,
			isSlowArchive
		);

		return ok(
			ScanSettingsFactory.createScanSettings(
				scanJob,
				toLedger,
				concurrency,
				isSlowArchive,
				fromLedger,
				latestLedgerHeader.ledger,
				latestLedgerHeader.hash
			)
		);
	}

	private static createScanSettings(
		scanJob: ScanJob,
		toLedger?: number,
		concurrency?: number,
		isSlowArchive?: boolean | null,
		fromLedger?: number,
		latestLedgerHeaderLedger?: number,
		latestLedgerHeaderHash?: string | null
	): ScanSettings {
		return {
			fromLedger: fromLedger ?? scanJob.fromLedger,
			toLedger: toLedger ?? scanJob.toLedger ?? 0,
			concurrency: concurrency ?? scanJob.concurrency,
			isSlowArchive: isSlowArchive ?? null,
			latestScannedLedger:
				latestLedgerHeaderLedger ?? scanJob.latestScannedLedger,
			latestScannedLedgerHeaderHash:
				latestLedgerHeaderHash !== undefined //careful because it could be null
					? latestLedgerHeaderHash
					: scanJob.latestScannedLedgerHeaderHash
		};
	}

	private async determineConcurrencyAndSlowArchive(
		scanJob: ScanJob,
		toLedger: number
	): Promise<
		Result<{ concurrency: number; isSlowArchive: boolean | null }, ScanError>
	> {
		if (scanJob.concurrency !== 0) {
			return ok({
				concurrency: scanJob.concurrency,
				isSlowArchive: null
			});
		}

		console.log('determining optimal concurrency');
		const performanceTestResultOrError =
			await this.archivePerformanceTester.test(scanJob.url, toLedger);

		if (performanceTestResultOrError.isErr())
			return err(
				new ScanError(
					ScanErrorType.TYPE_CONNECTION,
					scanJob.url.value,
					'Could not connect to determine optimal concurrency'
				)
			);

		console.log(performanceTestResultOrError);
		return ok({
			concurrency: performanceTestResultOrError.value.optimalConcurrency,
			isSlowArchive: performanceTestResultOrError.value.isSlowArchive
		});
	}

	private determineLatestLedgerHeader(
		scanJob: ScanJob,
		toLedger: number,
		isSlowArchive: boolean | null
	): { ledger: number; hash: string | null } {
		if (
			isSlowArchive &&
			this.slowArchiveExceedsMaxLedgersToScan(toLedger, scanJob)
		)
			return {
				ledger: 0,
				hash: null
			};
		return {
			ledger: scanJob.latestScannedLedger,
			hash: scanJob.latestScannedLedgerHeaderHash
		};
	}

	private determineFromLedger(
		scanJob: ScanJob,
		toLedger: number,
		isSlowArchive: boolean | null
	) {
		if (isSlowArchive)
			return this.slowArchiveExceedsMaxLedgersToScan(toLedger, scanJob)
				? toLedger - this.slowArchiveMaxNumberOfLedgersToScan
				: scanJob.fromLedger;

		return scanJob.fromLedger;
	}

	private slowArchiveExceedsMaxLedgersToScan(
		toLedger: number,
		scanJob: ScanJob
	) {
		return (
			toLedger - scanJob.fromLedger >= this.slowArchiveMaxNumberOfLedgersToScan
		);
	}

	private async determineToLedger(
		scanJob: ScanJob
	): Promise<Result<number, ScanError>> {
		if (scanJob.toLedger !== null) {
			return ok(scanJob.toLedger);
		}

		const latestLedgerOrError = await this.categoryScanner.findLatestLedger(
			scanJob.url
		);

		if (latestLedgerOrError.isErr()) {
			return err(
				new ScanError(
					ScanErrorType.TYPE_CONNECTION,
					scanJob.url.value,
					'Could not fetch latest ledger'
				)
			);
		}

		return ok(latestLedgerOrError.value);
	}
}
