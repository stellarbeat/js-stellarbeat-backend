import { injectable } from 'inversify';
import { ok, Result } from 'neverthrow';
import { HeartBeater } from '../../../core/services/HeartBeater';

@injectable()
export class DummyHeartBeater implements HeartBeater {
	tick() {
		return new Promise<Result<void, Error>>((resolve) =>
			resolve(ok(undefined))
		);
	}
}
