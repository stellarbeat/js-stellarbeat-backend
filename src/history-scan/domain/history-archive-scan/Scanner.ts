import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { Scan } from './Scan';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { RangeScanner } from './RangeScanner';
import { ScanJob } from './ScanJob';
import { ScanError } from './ScanError';
import { ScanSettings, ScanSettingsFactory } from './ScanSettingsFactory';
import { Url } from '../../../shared/domain/Url';

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
			return scanJob.createScanWithSettingsError(time, new Date(), error);
		}

		const scanSettings = scanSettingsOrError.value;

		this.logger.info('Scan settings', {
			url: scanJob.url.value,
			fromLedger: scanSettings.fromLedger,
			toLedger: scanSettings.toLedger,
			concurrency: scanSettings.concurrency,
			isSlowArchive: scanSettings.isSlowArchive
		});

		const error = await this.scanInRanges(scanJob, scanSettings);
		const scan = scanJob.createFinishedScan(
			time,
			new Date(),
			scanSettings,
			error
		);
		console.timeEnd('scan');

		return scan;
	}

	private async scanInRanges(
		scanJob: ScanJob,
		scanSettings: ScanSettings
	): Promise<undefined | ScanError> {
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
				scanJob.url,
				scanSettings.concurrency,
				rangeToLedger,
				rangeFromLedger,
				scanJob.latestScannedLedger,
				scanJob.latestScannedLedgerHeaderHash,
				alreadyScannedBucketHashes
			);
			console.timeEnd('range_scan');

			if (rangeResult.isErr()) {
				error = rangeResult.error;
			} else {
				scanJob.latestScannedLedger = rangeResult.value.latestLedgerHeader
					? rangeResult.value.latestLedgerHeader.ledger
					: rangeToLedger;
				scanJob.latestScannedLedgerHeaderHash =
					rangeResult.value.latestLedgerHeader?.hash ?? null;

				alreadyScannedBucketHashes = rangeResult.value.scannedBucketHashes;

				rangeFromLedger += this.rangeSize;
				rangeToLedger =
					rangeFromLedger + this.rangeSize < scanSettings.toLedger
						? rangeFromLedger + this.rangeSize
						: scanSettings.toLedger;
			}
		}

		return error;
	}
}
