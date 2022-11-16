import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { Scan } from './Scan';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { ScanError } from './ScanError';
import { RangeScanner } from './RangeScanner';
import { Url } from '../../../shared/domain/Url';

export type LedgerHeader = {
	ledger: number;
	hash?: string;
};

export interface ScanResult {
	latestVerifiedLedger: number;
	latestVerifiedLedgerHeaderHash?: string;
	scanError?: ScanError;
}

@injectable()
export class Scanner {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private historyArchiveRangeScanner: RangeScanner,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async continueScan(
		previousScan: Scan,
		toLedger: number,
		concurrency: number,
		rangeSize: number
	): Promise<Scan> {
		//todo return err if toLedger is wrong
		const scan = new Scan(
			new Date(),
			previousScan.latestVerifiedLedger + 1,
			toLedger,
			previousScan.baseUrl,
			concurrency,
			rangeSize
		);

		this.logger.info('Continue scan', {
			url: scan.baseUrl.value,
			toLedger: scan.toLedger,
			fromLedger: scan.fromLedger
		});

		const result = await this.scanInRanges(
			scan,
			previousScan.latestVerifiedLedger,
			previousScan.latestVerifiedLedgerHeaderHash
		);
		this.updateScanWithResults(scan, result);

		return scan;
	}

	async scan(
		fromLedger: number,
		toLedger: number,
		url: Url,
		concurrency: number,
		rangeSize: number
	): Promise<Scan> {
		const scan = new Scan(
			new Date(),
			fromLedger,
			toLedger,
			url,
			concurrency,
			rangeSize
		);

		this.logger.info('Starting scan', {
			url: scan.baseUrl.value,
			toLedger: scan.toLedger,
			fromLedger: scan.fromLedger
		});

		const result = await this.scanInRanges(scan);
		this.updateScanWithResults(scan, result);

		return scan;
	}

	private updateScanWithResults(scan: Scan, result: ScanResult) {
		if (result.scanError) {
			this.logger.info('error detected', {
				url: result.scanError.url,
				message: result.scanError.message
			});
		}

		scan.finish(
			new Date(),
			result.latestVerifiedLedger,
			result.latestVerifiedLedgerHeaderHash,
			result.scanError
		);
	}

	private async scanInRanges(
		scan: Scan,
		latestVerifiedLedger = 0,
		latestVerifiedLedgerHash?: string
	): Promise<ScanResult> {
		console.time('scan');
		let rangeFromLedger = scan.fromLedger; //todo move to range generator
		let rangeToLedger =
			rangeFromLedger + scan.rangeSize < scan.toLedger
				? rangeFromLedger + scan.rangeSize
				: scan.toLedger;

		let latestRangeVerifiedLedger = latestVerifiedLedger;
		let latestRangeVerifiedLedgerHash = latestVerifiedLedgerHash;

		let alreadyScannedBucketHashes = new Set<string>();

		let error: ScanError | undefined;

		while (rangeFromLedger < scan.toLedger) {
			console.time('range_scan');
			const rangeResult = await this.historyArchiveRangeScanner.scan(
				scan.baseUrl,
				scan.concurrency,
				rangeToLedger,
				rangeFromLedger,
				latestRangeVerifiedLedger,
				latestRangeVerifiedLedgerHash,
				alreadyScannedBucketHashes
			);
			console.timeEnd('range_scan');

			if (rangeResult.isErr()) {
				error = rangeResult.error;
				break;
			}

			latestRangeVerifiedLedger = rangeResult.value.latestLedgerHeader
				? rangeResult.value.latestLedgerHeader.ledger
				: rangeToLedger;
			latestRangeVerifiedLedgerHash =
				rangeResult.value.latestLedgerHeader?.hash;

			alreadyScannedBucketHashes = rangeResult.value.scannedBucketHashes;

			rangeFromLedger += scan.rangeSize;
			rangeToLedger =
				rangeFromLedger + scan.rangeSize < scan.toLedger
					? rangeFromLedger + scan.rangeSize
					: scan.toLedger;
		}
		console.timeEnd('scan');

		return {
			scanError: error,
			latestVerifiedLedgerHeaderHash: latestRangeVerifiedLedgerHash,
			latestVerifiedLedger: latestRangeVerifiedLedger
		};
	}
}
