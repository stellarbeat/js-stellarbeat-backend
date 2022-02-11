import { Url } from '../../../shared/domain/Url';

export function createDummyHistoryBaseUrl() {
	const url = Url.create('https://history.stellar.org');
	if (url.isErr()) throw url.error;

	return url.value;
}
