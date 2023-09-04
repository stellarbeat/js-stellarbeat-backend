import { HttpError, HttpResponse } from '../services/HttpService';
import { Result } from 'neverthrow';
import { asyncSleep } from './asyncSleep';

export async function retryHttpRequestIfNeeded<Args extends unknown[]>(
	amount: number,
	sleepMs: number,
	httpAction: (
		...httpActionParameters: Args
	) => Promise<Result<HttpResponse, HttpError>>,
	...parameters: Args
): Promise<Result<HttpResponse, HttpError>> {
	let count = 1;
	let result = await httpAction(...parameters);
	while (count < amount && retryNeeded(result)) {
		//exponential backoff
		await asyncSleep(Math.pow(2, count) * sleepMs);
		count++;
		result = await httpAction(...parameters);
	}

	return result;
}

function retryNeeded(result: Result<HttpResponse, HttpError>) {
	if (result.isErr()) {
		return true;
		/*if (
			result.error.code &&
			[
				'ETIMEDOUT',
				'ECONNABORTED',
				'TIMEOUT',
				'ERR_REQUEST_ABORTED',
				'ECONNRESET',
				'ENOTFOUND'
			].includes(result.error.code)
		) {
			return true;
		}

		const status = result.error.response?.status;
		if ((status && status >= 500 && status < 600) || status === 408) {
			return true;
		}*/
	}

	return false;
}
