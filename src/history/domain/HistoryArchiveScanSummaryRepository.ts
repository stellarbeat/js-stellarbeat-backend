import { HistoryArchiveScanSummary } from './HistoryArchiveScanSummary';

export interface HistoryArchiveScanSummaryRepository {
	save(
		historyArchiveScans: HistoryArchiveScanSummary[]
	): Promise<HistoryArchiveScanSummary[]>;
	findLatestByUrl(url: string): Promise<HistoryArchiveScanSummary | null>;
}
