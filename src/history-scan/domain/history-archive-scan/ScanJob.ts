import { Url } from '../../../shared/domain/Url';
import { Scan } from './Scan';
import { ScanError } from './ScanError';
import { ScanSettings, ScanSettingsError } from './ScanSettingsFactory';

export class ScanJob {
	private constructor(
		public readonly url: Url,
		public latestScannedLedger: number = 0,
		public latestScannedLedgerHeaderHash: string | null = null,
		public readonly chainInitDate: Date | null = null,
		public fromLedger: number = 0,
		public toLedger: number | null = null,
		public concurrency: number | null = null
	) {}

	static continuePreviousScan(
		previousScan: Scan,
		toLedger: number | null = null,
		concurrency: number | null = null
	) {
		return new ScanJob(
			previousScan.baseUrl,
			previousScan.latestScannedLedger,
			previousScan.latestScannedLedgerHeaderHash,
			previousScan.scanChainInitDate,
			previousScan.latestScannedLedger + 1,
			toLedger,
			concurrency
		);
	}

	static startNewScan(
		url: Url,
		fromLedger = 0,
		toLedger: number | null = null,
		concurrency: number | null = null
	) {
		return new ScanJob(url, 0, null, null, fromLedger, toLedger, concurrency);
	}

	isNewScanChainJob() {
		return this.chainInitDate === null;
	}

	createScanWithSettingsError(
		startDate: Date,
		endDate: Date,
		settingsError: ScanSettingsError
	) {
		return this.createScan(
			startDate,
			endDate,
			settingsError.fromLedger,
			settingsError.toLedger,
			settingsError.concurrency,
			settingsError.isSlowArchive,
			settingsError.error
		);
	}

	createFinishedScan(
		startDate: Date,
		endDate: Date,
		settings: ScanSettings,
		error?: ScanError
	) {
		return this.createScan(
			startDate,
			endDate,
			settings.fromLedger,
			settings.toLedger,
			settings.concurrency,
			settings.isSlowArchive,
			error
		);
	}

	private createScan(
		startDate: Date,
		endDate: Date,
		fromLedger: number,
		toLedger: number | null = null,
		concurrency = 0,
		archiveIsSlow: boolean | null = null,
		error?: ScanError
	) {
		return new Scan(
			this.chainInitDate ?? startDate,
			startDate,
			endDate,
			this.url,
			fromLedger,
			toLedger,
			this.latestScannedLedger,
			this.latestScannedLedgerHeaderHash,
			concurrency,
			archiveIsSlow,
			error ?? null
		);
	}
}
