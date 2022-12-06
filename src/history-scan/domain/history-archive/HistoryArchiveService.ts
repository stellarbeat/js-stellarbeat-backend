import { Result } from 'neverthrow';
import { Url } from '../../../shared/domain/Url';

export interface HistoryArchiveService {
	getHistoryArchiveUrls(): Promise<Result<Url[], Error>>;
}
