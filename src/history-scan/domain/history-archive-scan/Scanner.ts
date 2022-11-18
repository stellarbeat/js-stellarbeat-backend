import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { Scan } from './Scan';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { RangeScanner } from './RangeScanner';
import { CategoryScanner } from './CategoryScanner';
import { ScanSettingsOptimizer } from './ScanSettingsOptimizer';

export type LedgerHeader = {
	ledger: number;
	hash?: string;
};

@injectable()
export class Scanner {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private rangeScanner: RangeScanner,
		private categoryScanner: CategoryScanner,
		private scanSettingsOptimizer: ScanSettingsOptimizer,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async perform(
		scan: Scan,
		toLedger?: number,
		mandatoryConcurrency?: number
	): Promise<Scan> {
		if (!toLedger) {
			const latestLedgerOrError = await this.categoryScanner.findLatestLedger(
				scan.baseUrl
			);
			if (latestLedgerOrError.isErr()) {
				scan.markError(latestLedgerOrError.error);
				scan.finish(new Date());
				return scan;
			} else {
				toLedger = latestLedgerOrError.value;
			}
		}

		if (!mandatoryConcurrency) {
			//todo: cleaner solution to skip determining concurrency
			await this.scanSettingsOptimizer.optimizeOrFinishScan(scan, toLedger);
		}

		if (scan.hasError()) return scan;

		this.logger.info('Starting scan', {
			url: scan.baseUrl.value,
			toLedger: toLedger,
			fromLedger: scan.fromLedger
		});
		await this.scanInRanges(scan, toLedger);
		scan.finish(new Date());

		return scan;
	}

	private async scanInRanges(scan: Scan, toLedger: number): Promise<Scan> {
		console.time('scan');
		let rangeFromLedger = scan.fromLedger; //todo move to range generator
		let rangeToLedger =
			rangeFromLedger + scan.rangeSize < toLedger
				? rangeFromLedger + scan.rangeSize
				: toLedger;

		let alreadyScannedBucketHashes = new Set<string>();

		while (rangeFromLedger < toLedger && !scan.hasError()) {
			console.time('range_scan');
			const rangeResult = await this.rangeScanner.scan(
				scan.baseUrl,
				scan.concurrency,
				rangeToLedger,
				rangeFromLedger,
				scan.latestVerifiedLedger,
				scan.latestVerifiedLedgerHeaderHash,
				alreadyScannedBucketHashes
			);
			console.timeEnd('range_scan');

			if (rangeResult.isErr()) {
				scan.markError(rangeResult.error);
			} else {
				scan.updateLatestVerifiedLedger(
					rangeResult.value.latestLedgerHeader
						? rangeResult.value.latestLedgerHeader.ledger
						: rangeToLedger,
					rangeResult.value.latestLedgerHeader?.hash
				);

				alreadyScannedBucketHashes = rangeResult.value.scannedBucketHashes;

				rangeFromLedger += scan.rangeSize;
				rangeToLedger =
					rangeFromLedger + scan.rangeSize < toLedger
						? rangeFromLedger + scan.rangeSize
						: toLedger;
			}
		}
		console.timeEnd('scan');

		return scan;
	}
}
