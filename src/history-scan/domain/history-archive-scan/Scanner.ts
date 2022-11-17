import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { Scan } from './Scan';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { RangeScanner } from './RangeScanner';

export type LedgerHeader = {
	ledger: number;
	hash?: string;
};

@injectable()
export class Scanner {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private historyArchiveRangeScanner: RangeScanner,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async perform(scan: Scan): Promise<Scan> {
		this.logger.info('Starting scan', {
			url: scan.baseUrl.value,
			toLedger: scan.toLedger,
			fromLedger: scan.fromLedger
		});

		await this.scanInRanges(scan);
		scan.finish(new Date());

		return scan;
	}

	private async scanInRanges(scan: Scan): Promise<Scan> {
		console.time('scan');
		let rangeFromLedger = scan.fromLedger; //todo move to range generator
		let rangeToLedger =
			rangeFromLedger + scan.rangeSize < scan.toLedger
				? rangeFromLedger + scan.rangeSize
				: scan.toLedger;

		let alreadyScannedBucketHashes = new Set<string>();

		while (rangeFromLedger < scan.toLedger && !scan.hasError()) {
			console.time('range_scan');
			const rangeResult = await this.historyArchiveRangeScanner.scan(
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
					rangeFromLedger + scan.rangeSize < scan.toLedger
						? rangeFromLedger + scan.rangeSize
						: scan.toLedger;
			}
		}
		console.timeEnd('scan');

		return scan;
	}
}
