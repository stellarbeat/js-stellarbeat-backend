import { Result } from 'neverthrow';
import { Url } from '../../../core/domain/Url';

export interface HistoryArchiveService {
	getHistoryArchiveUrls(): Promise<Result<Url[], Error>>;
}
