import { injectable } from 'inversify';
import { Scan } from './Scan';
import { ArchivePerformanceTester } from './ArchivePerformanceTester';
import { ScanError, ScanErrorType } from './ScanError';

@injectable()
export class ScanSettingsOptimizer {
	constructor(public performanceTester: ArchivePerformanceTester) {}

	async optimizeOrFinishScan(
		scan: Scan,
		toLedger: number,
		concurrencyRange = [50, 35, 25, 20, 15, 10], //todo: could be configuration
		nrOfCheckPointsToTest = 5000 //todo: could be configuration
	): Promise<Scan> {
		const concurrencyResult =
			await this.performanceTester.determineOptimalConcurrency(
				scan.baseUrl,
				toLedger,
				false,
				concurrencyRange,
				nrOfCheckPointsToTest
			);

		if (concurrencyResult.concurrency === Infinity) {
			scan.markError(
				new ScanError(
					ScanErrorType.TYPE_CONNECTION,
					scan.baseUrl.value,
					'Could not connect to archive'
				)
			);
			scan.finish(new Date());
		}

		if (concurrencyResult.timeMsPerFile > 100) {
			scan.markError(
				new ScanError(
					ScanErrorType.TYPE_TOO_SLOW,
					scan.baseUrl.value,
					'Archive too slow'
				)
			);
			scan.finish(new Date());
		}

		scan.concurrency =
			concurrencyResult.concurrency === Infinity
				? 0
				: concurrencyResult.concurrency;

		return scan;
	}
}
