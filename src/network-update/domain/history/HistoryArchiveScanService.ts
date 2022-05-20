import { HistoryArchiveScan } from '../../../network/domain/HistoryArchiveScan';
import { Result } from 'neverthrow';

export interface HistoryArchiveScanService {
	findLatestScans(): Promise<Result<HistoryArchiveScan[], Error>>;
}
