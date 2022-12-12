import { Url } from '../../../../core/domain/Url';

let counter = 0;

export function createDummyHistoryBaseUrl() {
	const url = Url.create(`https://history${counter}.stellar.org`);
	if (url.isErr()) throw url.error;

	counter++;
	return url.value;
}
