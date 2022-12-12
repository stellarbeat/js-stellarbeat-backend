import { injectable } from 'inversify';
import { ok, Result } from 'neverthrow';
import { HeartBeater } from '../../domain/HeartBeater';

@injectable()
export class DummyHeartBeater implements HeartBeater {
	tick() {
		return new Promise<Result<void, Error>>((resolve) =>
			resolve(ok(undefined))
		);
	}
}
