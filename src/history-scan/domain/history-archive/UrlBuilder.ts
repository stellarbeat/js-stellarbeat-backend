import { Url } from '../../../core/domain/Url';
import { CheckPoint } from '../check-point/CheckPointGenerator';
import { Category } from './Category';

export class UrlBuilder {
	static getBucketUrl(baseUrl: Url, hash: string) {
		const prefix = UrlBuilder.getHexPrefix(hash);
		const urlOrError = Url.create(
			`${baseUrl.value}/bucket${prefix}/bucket-${hash}.xdr.gz`
		);
		if (urlOrError.isErr()) throw urlOrError.error;

		return urlOrError.value;
	}

	static getRootHASUrl(historyBaseUrl: Url) {
		const urlResult = Url.create(
			`${historyBaseUrl.value}/.well-known/stellar-history.json`
		);
		if (urlResult.isErr()) throw urlResult.error;

		return urlResult.value;
	}

	static getCategoryUrl(
		historyBaseUrl: Url,
		checkPoint: CheckPoint,
		category: Category
	): Url {
		const paddedHex = UrlBuilder.getPaddedHex(checkPoint);
		const pathPrefix = UrlBuilder.getHexPrefix(paddedHex);
		const hex = UrlBuilder.getPaddedHex(checkPoint);
		const extension = UrlBuilder.getExtension(category);
		const urlResult = Url.create(
			`${historyBaseUrl.value}/${category}${pathPrefix}/${category}-${hex}${extension}`
		);
		if (urlResult.isErr()) throw urlResult.error;

		return urlResult.value;
	}

	static getHASUrl(historyBaseUrl: Url) {
		const urlOrError = Url.create(
			historyBaseUrl + '/.well-known/stellar-history.json'
		);
		if (urlOrError.isErr()) throw urlOrError.error; // should not happen

		return urlOrError.value;
	}

	private static getHexPrefix(paddedHex: string): string {
		return `/${paddedHex.substr(0, 2)}/${paddedHex.substr(
			2,
			2
		)}/${paddedHex.substr(4, 2)}`;
	}

	private static getPaddedHex(ledger: number): string {
		return ledger.toString(16).padStart(8, '0');
	}

	private static getExtension(category: Category) {
		if (['results', 'transactions', 'ledger'].includes(category))
			return '.xdr.gz';

		return '.json';
	}
}
