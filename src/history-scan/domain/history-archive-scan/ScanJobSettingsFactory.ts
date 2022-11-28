import { ScanError, ScanErrorType } from './ScanError';
import { isNumber } from '../../../shared/utilities/TypeGuards';
import { injectable } from 'inversify';
import { ScanJob, ScanJobSettings, ScanJobSettingsError } from './ScanJob';
import { err, ok, Result } from 'neverthrow';
import { CategoryScanner } from './CategoryScanner';
import { ArchivePerformanceTester } from './ArchivePerformanceTester';

@injectable()
export class ScanJobSettingsFactory {
	constructor(
		private categoryScanner: CategoryScanner,
		private archivePerformanceTester: ArchivePerformanceTester,
		private maxTimeMSPerFile = 20, //how much time can we spend on downloading a small file on average with concurrency.
		private slowArchiveMaxNumberOfLedgersToScan = 120960 //by default only scan the latest week worth of ledgers for slow archives (5sec ledger close time)
	) {}
	async create(
		scanJob: ScanJob,
		fromLedger?: number,
		toLedger?: number,
		concurrency?: number
	): Promise<Result<ScanJobSettings, ScanJobSettingsError>> {
		let error: ScanError | undefined;

		if (!toLedger) {
			const latestLedgerOrError = await this.categoryScanner.findLatestLedger(
				scanJob.url
			);
			if (latestLedgerOrError.isErr()) {
				error = new ScanError(
					ScanErrorType.TYPE_CONNECTION,
					scanJob.url.value,
					'Could not fetch latest ledger'
				);
			} else {
				toLedger = latestLedgerOrError.value;
			}
		}

		let isSlowArchive: boolean | null = null;

		if (!concurrency && toLedger) {
			const optimalConcurrency =
				await this.archivePerformanceTester.determineOptimalConcurrency(
					scanJob.url,
					toLedger
				);
			if (!isNumber(optimalConcurrency.concurrency))
				error = new ScanError(
					ScanErrorType.TYPE_CONNECTION,
					scanJob.url.value,
					'Could not connect'
				);
			else {
				concurrency = optimalConcurrency.concurrency;
				isSlowArchive = isNumber(optimalConcurrency.timeMsPerFile)
					? optimalConcurrency.timeMsPerFile > this.maxTimeMSPerFile
					: null;
			}
		}
		if (!concurrency) concurrency = 0;

		if (!fromLedger) {
			if (!scanJob.isNewScanChainJob()) {
				fromLedger = scanJob.latestScannedLedger + 1;
			} else if (isSlowArchive && toLedger) {
				fromLedger =
					toLedger - this.slowArchiveMaxNumberOfLedgersToScan >= 0
						? toLedger - this.slowArchiveMaxNumberOfLedgersToScan
						: 0;
			} else fromLedger = 0;
		}
		if (!toLedger) toLedger = fromLedger;

		if (error) {
			return err({
				fromLedger: fromLedger,
				toLedger: toLedger,
				concurrency: concurrency,
				isSlowArchive: isSlowArchive,
				error: error
			});
		}

		return ok({
			fromLedger: fromLedger,
			toLedger: toLedger,
			concurrency: concurrency,
			isSlowArchive: isSlowArchive
		});
	}
}
