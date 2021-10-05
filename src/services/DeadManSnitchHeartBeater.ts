import { err, ok, Result } from 'neverthrow';
import axios from 'axios';
import { injectable } from 'inversify';
import { Url } from '../value-objects/Url';

export interface HeartBeater {
	tick(): Promise<Result<void, Error>>;
}

@injectable()
export class DummyHeartBeater implements HeartBeater {
	tick() {
		return new Promise<Result<void, Error>>((resolve) =>
			resolve(ok(undefined))
		);
	}
}

@injectable()
export class DeadManSnitchHeartBeater implements HeartBeater {
	protected url: Url;
	constructor(url: Url) {
		this.url = url;
	}

	async tick(): Promise<Result<void, Error>> {
		let timeout: NodeJS.Timeout | undefined;

		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, 2050);
			await axios.get(this.url.value, {
				cancelToken: source.token,
				timeout: 2000,
				headers: { 'User-Agent': 'stellarbeat.io' }
			});
			clearTimeout(timeout);

			return ok(undefined);
		} catch (e) {
			if (timeout) clearTimeout(timeout);
			if (e instanceof Error) return err(e);

			return err(new Error('Heartbeat error'));
		}
	}
}
