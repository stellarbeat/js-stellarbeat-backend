import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { Scan } from './Scan';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { ScanError } from './ScanError';
import { RangeScanner } from './RangeScanner';

export type LedgerHeader = {
	ledger: number;
	hash?: string;
};

export interface ScanResult {
	latestLedgerHeader?: LedgerHeader;
}

@injectable()
export class Scanner {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private historyArchiveRangeScanner: RangeScanner,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async scan(historyArchiveScan: Scan): Promise<Result<Scan, Error>> {
		this.logger.info('Starting scan', {
			history: historyArchiveScan.baseUrl.value,
			toLedger: historyArchiveScan.toLedger,
			fromLedger: historyArchiveScan.fromLedger
		});

		console.time('scan');
		const result = await this.scanInChunks(historyArchiveScan);
		console.timeEnd('scan');

		let error: ScanError | undefined;
		if (result.isErr()) {
			this.logger.info('error detected', {
				url: result.error.url,
				message: result.error.message
			});
			error = result.error;
		}

		historyArchiveScan.finish(new Date(), error);

		return ok(historyArchiveScan);
	}

	private async scanInChunks(
		scan: Scan
	): Promise<Result<ScanResult, ScanError>> {
		let rangeFromLedger = scan.fromLedger; //todo move to range generator
		let rangeToLedger =
			rangeFromLedger + scan.chunkSize < scan.toLedger
				? rangeFromLedger + scan.chunkSize
				: scan.toLedger;

		let latestScannedLedger = scan.latestScannedLedger;
		let latestScannedLedgerHash = scan.latestScannedLedgerHeaderHash;
		//pick up where we left off from a previous scan.
		let alreadyScannedBucketHashes = new Set<string>();

		let error: ScanError | null = null;

		while (rangeFromLedger < scan.toLedger) {
			console.time('range_scan');
			const rangeResult = await this.historyArchiveRangeScanner.scan(
				scan.baseUrl,
				scan.maxConcurrency,
				rangeToLedger,
				rangeFromLedger,
				latestScannedLedger,
				latestScannedLedgerHash,
				alreadyScannedBucketHashes
			);
			console.timeEnd('range_scan');

			if (rangeResult.isErr()) {
				error = rangeResult.error;
				break;
			}

			latestScannedLedger = rangeResult.value.latestLedgerHeader
				? rangeResult.value.latestLedgerHeader.ledger
				: rangeToLedger;
			latestScannedLedgerHash = rangeResult.value.latestLedgerHeader?.hash;

			alreadyScannedBucketHashes = rangeResult.value.scannedBucketHashes;

			rangeFromLedger += scan.chunkSize;
			rangeToLedger =
				rangeFromLedger + scan.chunkSize < scan.toLedger
					? rangeFromLedger + scan.chunkSize
					: scan.toLedger;
		}

		if (error) return err(error);

		return ok({
			latestLedgerHeader: {
				ledger: latestScannedLedger,
				hash: latestScannedLedgerHash
			}
		});
	}
}
