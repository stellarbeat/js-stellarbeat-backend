import { Url } from '../../shared/domain/Url';
import { Result } from 'neverthrow';

export class UrlBuilder {
	static getCategoryUrl(
		historyBaseUrl: Url,
		ledger: number,
		category: 'results' | 'history' | 'transactions' | 'ledger',
		extension: '.xdr.gz' | '.json'
	): Result<Url, Error> {
		const pathPrefix = UrlBuilder.getHexPrefix(ledger);
		const hex = UrlBuilder.getPaddedHex(ledger);
		return Url.create(
			`${historyBaseUrl.value}/${category}${pathPrefix}/${category}-${hex}${extension}`
		);
	}

	static getHexPrefix(ledger: number): string {
		const ledgerHex = UrlBuilder.getPaddedHex(ledger);

		return `/${ledgerHex.substr(0, 2)}/${ledgerHex.substr(
			2,
			2
		)}/${ledgerHex.substr(4, 2)}`;
	}

	static getPaddedHex(ledger: number): string {
		return ledger.toString(16).padStart(8, '0');
	}
}
