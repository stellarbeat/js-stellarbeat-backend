import { injectable } from 'inversify';
import axios from 'axios';
import { err, ok, Result } from 'neverthrow';
import { Url } from '../value-objects/Url';

@injectable()
export class APICacheClearer {
	protected url: Url; //= process.env.;
	protected token: string; // = process.env.

	constructor(url: Url, token: string) {
		this.url = url;
		this.token = token;
	}

	async clearApiCache(): Promise<Result<void, Error>> {
		let timeout: NodeJS.Timeout | undefined;
		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, 2050);
			await axios.get(this.url + '?token=' + this.token, {
				cancelToken: source.token,
				timeout: 2000,
				headers: { 'User-Agent': 'stellarbeat.io' } //todo: configuration env
			});
			clearTimeout(timeout);
			return ok(undefined);
		} catch (error) {
			if (timeout) clearTimeout(timeout);
			if (error instanceof Error) return err(error);
			return err(new Error('Error clearing API CACHE'));
		}
	}
}
