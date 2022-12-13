import { inject, injectable } from 'inversify';
import { Logger } from '../../../core/services/PinoLogger';
import { Scan } from '../scan/Scan';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { RangeScanner } from './RangeScanner';
import { ScanJob } from '../scan/ScanJob';
import { ScanError } from '../scan/ScanError';
import { ScanSettingsFactory } from '../scan/ScanSettingsFactory';
import { ScanSettings } from '../scan/ScanSettings';
import { ScanResult } from '../scan/ScanResult';
import { Url } from '../../../core/domain/Url';

export type LedgerHeader = {
	ledger: number;
	hash?: string;
};

@injectable()
export class Scanner {
	constructor(
		private rangeScanner: RangeScanner,
		private scanJobSettingsFactory: ScanSettingsFactory,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger,
		private readonly rangeSize = 1000000
	) {}

	async perform(time: Date, scanJob: ScanJob): Promise<Scan> {
		console.time('scan');

		this.logger.info('Starting scan', {
			url: scanJob.url.value,
			isStartOfChain: scanJob.isNewScanChainJob(),
			chainInitDate: scanJob.chainInitDate
		});

		const scanSettingsOrError =
			await this.scanJobSettingsFactory.determineSettings(scanJob);

		if (scanSettingsOrError.isErr()) {
			const error = scanSettingsOrError.error;
			return scanJob.createFailedScanCouldNotDetermineSettings(
				time,
				new Date(),
				error
			);
		}

		const scanSettings = scanSettingsOrError.value;

		this.logger.info('Scan settings', {
			url: scanJob.url.value,
			fromLedger: scanSettings.fromLedger,
			toLedger: scanSettings.toLedger,
			concurrency: scanSettings.concurrency,
			isSlowArchive: scanSettings.isSlowArchive
		});

		const scanResult = await this.scanInRanges(scanJob.url, scanSettings);
		const scan = scanJob.createScanFromScanResult(
			time,
			new Date(),
			scanSettings,
			scanResult
		);
		console.timeEnd('scan');

		return scan;
	}

	private async scanInRanges(
		url: Url,
		scanSettings: ScanSettings
	): Promise<ScanResult> {
		const latestLedgerHeader: LedgerHeader = {
			ledger: scanSettings.latestScannedLedger,
			hash: scanSettings.latestScannedLedgerHeaderHash ?? undefined
		};

		let rangeFromLedger = scanSettings.fromLedger; //todo move to range generator
		let rangeToLedger =
			rangeFromLedger + this.rangeSize < scanSettings.toLedger
				? rangeFromLedger + this.rangeSize
				: scanSettings.toLedger;

		let alreadyScannedBucketHashes = new Set<string>();
		let error: ScanError | undefined;

		while (rangeFromLedger < scanSettings.toLedger && !error) {
			console.time('range_scan');
			const rangeResult = await this.rangeScanner.scan(
				url,
				scanSettings.concurrency,
				rangeToLedger,
				rangeFromLedger,
				latestLedgerHeader.ledger,
				latestLedgerHeader.hash,
				alreadyScannedBucketHashes
			);
			console.timeEnd('range_scan');

			if (rangeResult.isErr()) {
				error = rangeResult.error;
			} else {
				latestLedgerHeader.ledger = rangeResult.value.latestLedgerHeader
					? rangeResult.value.latestLedgerHeader.ledger
					: rangeToLedger;
				latestLedgerHeader.hash = rangeResult.value.latestLedgerHeader?.hash;

				alreadyScannedBucketHashes = rangeResult.value.scannedBucketHashes;

				rangeFromLedger += this.rangeSize;
				rangeToLedger =
					rangeFromLedger + this.rangeSize < scanSettings.toLedger
						? rangeFromLedger + this.rangeSize
						: scanSettings.toLedger;
			}
		}

		return {
			latestLedgerHeader,
			error
		};
	}
}
