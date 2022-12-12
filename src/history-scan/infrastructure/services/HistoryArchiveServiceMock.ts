import { HistoryArchiveService } from '../../domain/history-archive/HistoryArchiveService';
import { Url } from '../../../core/domain/Url';
import { ok, Result } from 'neverthrow';

export class HistoryArchiveServiceMock implements HistoryArchiveService {
	async getHistoryArchiveUrls(): Promise<Result<Url[], Error>> {
		const urlOrError = Url.create('http://127.0.0.1');
		if (urlOrError.isErr()) throw urlOrError.error;

		return Promise.resolve(ok([urlOrError.value]));
	}
}
