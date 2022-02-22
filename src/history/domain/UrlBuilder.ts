import { Url } from '../../shared/domain/Url';
import { Result } from 'neverthrow';

export class UrlBuilder {
	static getCategoryUrl(
		historyBaseUrl: Url,
		ledger: number,
		category: 'results' | 'history' | 'transactions' | 'ledger',
		extension: '.xdr.gz' | '.json'
	): Result<Url, Error> {
		const paddedHex = UrlBuilder.getPaddedHex(ledger);
		const pathPrefix = UrlBuilder.getHexPrefix(paddedHex);
		const hex = UrlBuilder.getPaddedHex(ledger);
		return Url.create(
			`${historyBaseUrl.value}/${category}${pathPrefix}/${category}-${hex}${extension}`
		);
	}

	static getHexPrefix(paddedHex: string): string {
		return `/${paddedHex.substr(0, 2)}/${paddedHex.substr(
			2,
			2
		)}/${paddedHex.substr(4, 2)}`;
	}

	static getPaddedHex(ledger: number): string {
		return ledger.toString(16).padStart(8, '0');
	}
}
