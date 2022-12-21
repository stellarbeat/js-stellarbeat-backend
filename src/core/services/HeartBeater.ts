import { Result } from 'neverthrow';

export interface HeartBeater {
	tick(): Promise<Result<void, Error>>;
}
