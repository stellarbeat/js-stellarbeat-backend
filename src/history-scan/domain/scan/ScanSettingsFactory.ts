import { ScanError, ScanErrorType } from './ScanError';
import { isNumber } from '../../../core/utilities/TypeGuards';
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
		private maxTimeMSPerFile = 30, //how much time can we spend on downloading a small file on average with concurrency.
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

		return ok(
			ScanSettingsFactory.createScanSettings(
				scanJob,
				toLedger,
				concurrency,
				isSlowArchive,
				fromLedger
			)
		);
	}

	private static createScanSettings(
		scanJob: ScanJob,
		toLedger?: number,
		concurrency?: number,
		isSlowArchive?: boolean | null,
		fromLedger?: number
	): ScanSettings {
		return {
			fromLedger: fromLedger ?? scanJob.fromLedger,
			toLedger: toLedger ?? scanJob.toLedger ?? 0,
			concurrency: concurrency ?? scanJob.concurrency,
			isSlowArchive: isSlowArchive ?? null
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

		const optimalConcurrency =
			await this.archivePerformanceTester.determineOptimalConcurrency(
				scanJob.url,
				toLedger
			);

		console.log(optimalConcurrency);
		if (!isNumber(optimalConcurrency.concurrency))
			return err(
				new ScanError(
					ScanErrorType.TYPE_CONNECTION,
					scanJob.url.value,
					'Could not connect to determine optimal concurrency'
				)
			);
		const concurrency = optimalConcurrency.concurrency;
		const isSlowArchive = isNumber(optimalConcurrency.timeMsPerFile)
			? optimalConcurrency.timeMsPerFile > this.maxTimeMSPerFile
			: null;

		return ok({
			concurrency,
			isSlowArchive
		});
	}

	private determineFromLedger(
		scanJob: ScanJob,
		toLedger: number,
		isSlowArchive: boolean | null
	) {
		if (isSlowArchive)
			return toLedger - this.slowArchiveMaxNumberOfLedgersToScan >= 0
				? toLedger - this.slowArchiveMaxNumberOfLedgersToScan
				: 0;
		return scanJob.fromLedger;
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
