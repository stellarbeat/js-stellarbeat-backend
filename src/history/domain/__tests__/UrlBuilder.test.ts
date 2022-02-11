import { UrlBuilder } from '../UrlBuilder';
import { Url } from '../../../shared/domain/Url';

it('should convert ledger number to hex prefix', function () {
	expect(UrlBuilder.getHexPrefix(39279103)).toEqual('/02/57/59');
});

it('should return ledger url', function () {
	const historyBaseUrl = Url.create('https://history.stellar.org');
	if (historyBaseUrl.isErr()) throw historyBaseUrl.error;

	const url = UrlBuilder.getCategoryUrl(
		historyBaseUrl.value,
		39279103,
		'ledger',
		'.xdr.gz'
	);
	if (url.isErr()) throw url.error;

	expect(url.value.value).toEqual(
		'https://history.stellar.org/ledger/02/57/59/ledger-025759ff.xdr.gz'
	);
});
