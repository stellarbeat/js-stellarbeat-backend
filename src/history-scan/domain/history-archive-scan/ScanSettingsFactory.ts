import { ScanError, ScanErrorType } from './ScanError';
import { isNumber } from '../../../shared/utilities/TypeGuards';
import { injectable } from 'inversify';
import { ScanJob } from './ScanJob';
import { err, ok, Result } from 'neverthrow';
import { CategoryScanner } from './CategoryScanner';
import { ArchivePerformanceTester } from './ArchivePerformanceTester';

export interface ScanSettings {
	fromLedger: number;
	toLedger: number;
	concurrency: number;
	isSlowArchive: boolean | null;
}

export interface ScanSettingsError {
	scanSettings: ScanSettings;
	error: ScanError;
}

@injectable()
export class ScanSettingsFactory {
	constructor(
		private categoryScanner: CategoryScanner,
		private archivePerformanceTester: ArchivePerformanceTester,
		private maxTimeMSPerFile = 30, //how much time can we spend on downloading a small file on average with concurrency.
		private slowArchiveMaxNumberOfLedgersToScan = 120960 //by default only scan the latest week worth of ledgers for slow archives (5sec ledger close time)
	) {}

	async determineSettings(
		scanJob: ScanJob
	): Promise<Result<ScanSettings, ScanSettingsError>> {
		const scanSettings: ScanSettings = {
			fromLedger: 0,
			toLedger: 0,
			concurrency: 0,
			isSlowArchive: null
		};

		const toLedgerResult = await this.determineToLedger(scanJob, scanSettings);
		if (toLedgerResult.isErr()) {
			return err({
				scanSettings,
				error: toLedgerResult.error
			});
		}

		const concurrencyResult = await this.determineConcurrencyAndSlowArchive(
			scanJob,
			scanSettings
		);
		if (concurrencyResult.isErr()) {
			return err({
				scanSettings,
				error: concurrencyResult.error
			});
		}

		this.determineFromLedger(scanJob, scanSettings);

		return ok(scanSettings);
	}

	private async determineConcurrencyAndSlowArchive(
		scanJob: ScanJob,
		scanSettings: ScanSettings
	): Promise<Result<undefined, ScanError>> {
		if (scanJob.concurrency !== 0) {
			scanSettings.concurrency = scanJob.concurrency;
			return ok(undefined);
		}

		const optimalConcurrency =
			await this.archivePerformanceTester.determineOptimalConcurrency(
				scanJob.url,
				scanSettings.toLedger
			);
		console.log(optimalConcurrency);
		if (!isNumber(optimalConcurrency.concurrency))
			return err(
				new ScanError(
					ScanErrorType.TYPE_CONNECTION,
					scanJob.url.value,
					'Could not connect'
				)
			);
		scanSettings.concurrency = optimalConcurrency.concurrency;
		scanSettings.isSlowArchive = isNumber(optimalConcurrency.timeMsPerFile)
			? optimalConcurrency.timeMsPerFile > this.maxTimeMSPerFile
			: null;

		return ok(undefined);
	}

	private determineFromLedger(scanJob: ScanJob, scanSettings: ScanSettings) {
		if (scanSettings.isSlowArchive) {
			scanSettings.fromLedger =
				scanSettings.toLedger - this.slowArchiveMaxNumberOfLedgersToScan >= 0
					? scanSettings.toLedger - this.slowArchiveMaxNumberOfLedgersToScan
					: 0;
		} else {
			scanSettings.fromLedger = scanJob.fromLedger;
		}
	}

	private async determineToLedger(
		scanJob: ScanJob,
		scanSettings: ScanSettings
	): Promise<Result<void, ScanError>> {
		if (scanJob.toLedger !== null) {
			scanSettings.toLedger = scanJob.toLedger;
			return ok(undefined);
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

		scanSettings.toLedger = latestLedgerOrError.value;
		return ok(undefined);
	}
}
