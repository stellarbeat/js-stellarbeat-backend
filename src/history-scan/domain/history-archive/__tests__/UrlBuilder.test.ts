import { UrlBuilder } from '../UrlBuilder';
import { Url } from '../../../../core/domain/Url';
import { createDummyHistoryBaseUrl } from '../__fixtures__/HistoryBaseUrl';
import { Category } from '../Category';

it('should return ledger url', function () {
	const historyBaseUrl = Url.create('https://history.stellar.org');
	if (historyBaseUrl.isErr()) throw historyBaseUrl.error;

	const url = UrlBuilder.getCategoryUrl(
		historyBaseUrl.value,
		39279103,
		Category.ledger
	);

	expect(url.value).toEqual(
		'https://history.stellar.org/ledger/02/57/59/ledger-025759ff.xdr.gz'
	);
});

it('should generate correct bucket url', function () {
	const url = createDummyHistoryBaseUrl();
	expect(
		UrlBuilder.getBucketUrl(
			url,
			'bd96d76dec3196938aa7acb8116ddb5e442201032ab32dfb5af30fb8563c04d5'
		).value
	).toEqual(
		url.value +
			'/bucket/bd/96/d7/bucket-bd96d76dec3196938aa7acb8116ddb5e442201032ab32dfb5af30fb8563c04d5.xdr.gz'
	);
});
