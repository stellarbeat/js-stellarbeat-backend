import { HttpError, HttpResponse } from '../services/HttpService';
import { Result } from 'neverthrow';

export async function retryHttpRequestIfNeeded<Args extends unknown[]>(
	amount: number,
	httpAction: (
		...httpActionParameters: Args
	) => Promise<Result<HttpResponse, HttpError>>,
	...parameters: Args
): Promise<Result<HttpResponse, HttpError>> {
	let count = 1;
	let result = await httpAction(...parameters);
	while (count < amount && retryNeeded(result)) {
		console.log('RETRY');
		count++;
		result = await httpAction(...parameters);
	}

	if (count === amount && retryNeeded(result)) {
		console.log('Retry stop');
	}

	return result;
}

function retryNeeded(result: Result<HttpResponse, HttpError>) {
	if (result.isErr()) {
		console.log(result.error.code);
		console.log(result.error.response?.status);
		if (
			result.error.code &&
			[
				'ETIMEDOUT',
				'ECONNABORTED',
				'TIMEOUT',
				'ERR_REQUEST_ABORTED',
				'ECONNRESET'
			].includes(result.error.code)
		) {
			return true;
		}

		const status = result.error.response?.status;
		if (status && status >= 500 && status < 600) {
			return true;
		}
	}

	return false;
}
