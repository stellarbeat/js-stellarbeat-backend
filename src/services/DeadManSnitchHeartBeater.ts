import { err, ok, Result } from 'neverthrow';
import axios from 'axios';
import { injectable } from 'inversify';

export interface HeartBeater {
	tick(): Promise<Result<void, Error>>;
}

@injectable()
export class DeadManSnitchHeartBeater implements HeartBeater {
	async tick(): Promise<Result<void, Error>> {
		let timeout: NodeJS.Timeout | undefined;

		try {
			const deadManSwitchUrl = process.env.DEADMAN_URL;
			if (deadManSwitchUrl) {
				const source = axios.CancelToken.source();
				timeout = setTimeout(() => {
					source.cancel('Connection time-out');
					// Timeout Logic
				}, 2050);
				await axios.get(deadManSwitchUrl, {
					cancelToken: source.token,
					timeout: 2000,
					headers: { 'User-Agent': 'stellarbeat.io' }
				});
				clearTimeout(timeout);
			}

			return ok(undefined);
		} catch (e) {
			if (timeout) clearTimeout(timeout);
			if (e instanceof Error) return err(e);

			return err(new Error('Heartbeat error'));
		}
	}
}
