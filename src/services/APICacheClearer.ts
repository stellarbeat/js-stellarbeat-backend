import { injectable } from 'inversify';
import axios from 'axios';
import { err, ok, Result } from 'neverthrow';

@injectable()
export class APICacheClearer {
	async clearApiCache(): Promise<Result<void, Error>> {
		const backendApiClearCacheUrl = process.env.BACKEND_API_CACHE_URL;
		const backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;

		if (!backendApiClearCacheToken || !backendApiClearCacheUrl) {
			throw 'Backend cache not configured';
		}

		let timeout: NodeJS.Timeout | undefined;
		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, 2050);
			await axios.get(
				backendApiClearCacheUrl + '?token=' + backendApiClearCacheToken,
				{
					cancelToken: source.token,
					timeout: 2000,
					headers: { 'User-Agent': 'stellarbeat.io' }
				}
			);
			clearTimeout(timeout);
			return ok(undefined);
		} catch (error) {
			if (timeout) clearTimeout(timeout);
			if (error instanceof Error) return err(error);
			return err(new Error('Error clearing API CACHE'));
		}
	}
}
