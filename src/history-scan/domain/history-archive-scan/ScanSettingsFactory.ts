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
	fromLedger: number;
	toLedger: number | null;
	concurrency: number;
	isSlowArchive: boolean | null;
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
		let error: ScanError | undefined;

		let toLedger = scanJob.toLedger;
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

		let concurrency = scanJob.concurrency;
		if (!concurrency && toLedger) {
			const optimalConcurrency =
				await this.archivePerformanceTester.determineOptimalConcurrency(
					scanJob.url,
					toLedger
				);
			console.log(optimalConcurrency);
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

		let fromLedger = scanJob.fromLedger;
		if (isSlowArchive && toLedger) {
			fromLedger =
				toLedger - this.slowArchiveMaxNumberOfLedgersToScan >= 0
					? toLedger - this.slowArchiveMaxNumberOfLedgersToScan
					: 0;
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
