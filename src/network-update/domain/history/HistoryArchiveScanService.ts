import { Result } from 'neverthrow';
import { HistoryArchiveScan } from '@stellarbeat/js-stellar-domain';

export interface HistoryArchiveScanService {
	findLatestScans(): Promise<Result<HistoryArchiveScan[], Error>>;
}
