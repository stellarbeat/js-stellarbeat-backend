import { err } from 'neverthrow';
import { HttpError } from '../../services/HttpService';
import { retryHttpRequestIfNeeded } from '../HttpRequestRetry';

it('should retry the correct amount of times', async function () {
	const actionWrap = createErrorAction('500', 500);
	await retryHttpRequestIfNeeded(2, 400, actionWrap.action);

	expect(actionWrap.getCount()).toEqual(2);
});

it('should retry on timeout', async function () {
	const actionWrap = createErrorAction('ETIMEDOUT');
	await retryHttpRequestIfNeeded(3, 400, actionWrap.action);

	expect(actionWrap.getCount()).toEqual(3);
});

function createErrorAction(code: string, status?: number) {
	let counter = 0;
	const getCount = () => {
		return counter;
	};
	const action = async () => {
		counter++;
		return err(
			new HttpError(
				'message',
				code,
				status === undefined
					? undefined
					: {
							data: null,
							status: status,
							headers: [],
							statusText: 'text'
					  }
			)
		);
	};

	return { getCount: getCount, action: action };
}
