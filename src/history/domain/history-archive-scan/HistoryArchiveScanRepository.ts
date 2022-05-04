import { HistoryArchiveScan } from './HistoryArchiveScan';

export interface HistoryArchiveScanRepository {
	save(
		historyArchiveScans: HistoryArchiveScan[]
	): Promise<HistoryArchiveScan[]>;
	findLatestByUrl(url: string): Promise<HistoryArchiveScan | null>;
}
