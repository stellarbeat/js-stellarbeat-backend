import { Result } from 'neverthrow';
import { HistoryArchiveScan } from '@stellarbeat/js-stellarbeat-shared';

export interface HistoryArchiveScanService {
	findLatestScans(): Promise<Result<HistoryArchiveScan[], Error>>;
}
