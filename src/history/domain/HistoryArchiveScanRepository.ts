import { HistoryArchiveScan } from './HistoryArchiveScan';

export interface HistoryArchiveScanRepository {
	save(
		historyArchiveScans: HistoryArchiveScan[]
	): Promise<HistoryArchiveScan[]>;
}
