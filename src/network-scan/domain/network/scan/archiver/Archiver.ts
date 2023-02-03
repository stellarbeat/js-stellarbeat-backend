import { Result } from 'neverthrow';

export interface Archiver {
	archive(time: Date): Promise<Result<void, Error>>;
}
