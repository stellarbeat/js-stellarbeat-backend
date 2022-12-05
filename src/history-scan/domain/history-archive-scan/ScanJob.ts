import { Url } from '../../../shared/domain/Url';
import { Scan } from './Scan';
import { ScanError } from './ScanError';

export interface ScanJobSettings {
	fromLedger: number;
	toLedger: number;
	concurrency: number;
	isSlowArchive: boolean | null;
}

export interface ScanJobSettingsError {
	fromLedger: number;
	toLedger: number | null;
	concurrency: number;
	isSlowArchive: boolean | null;
	error: ScanError;
}

export class ScanJob {
	private constructor(
		public readonly url: Url,
		public latestScannedLedger: number = 0,
		public latestScannedLedgerHeaderHash: string | null = null,
		public readonly chainInitDate: Date | null = null
	) {}

	static continueScanChain(previousScan: Scan) {
		return new ScanJob(
			previousScan.baseUrl,
			previousScan.latestScannedLedger,
			previousScan.latestScannedLedgerHeaderHash,
			previousScan.scanChainInitDate
		);
	}

	static startNewScanChain(url: Url) {
		return new ScanJob(url, 0);
	}

	isNewScanChainJob() {
		return this.chainInitDate === null;
	}

	createScanWithSettingsError(
		startDate: Date,
		endDate: Date,
		settingsError: ScanJobSettingsError
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
		settings: ScanJobSettings,
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
