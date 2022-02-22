import { Url } from '../../shared/domain/Url';
import { UrlBuilder } from './UrlBuilder';

export class CheckPoint {
	public readonly ledger: number; //multiple of 64 minus 1, first checkpoint at 63

	constructor(
		ledgerInCheckPoint: number,
		public readonly historyArchiveBaseUrl: Url
	) {
		this.ledger = Math.floor((ledgerInCheckPoint + 64) / 64) * 64 - 1;
	}

	get ledgersCategoryUrl() {
		return this.getUrl('ledger', '.xdr.gz');
	}

	get transactionsCategoryUrl() {
		return this.getUrl('transactions', '.xdr.gz');
	}

	get resultsCategoryUrl() {
		return this.getUrl('results', '.xdr.gz');
	}

	get historyCategoryUrl() {
		return this.getUrl('history', '.json');
	}

	getBucketUrl(hash: string) {
		const prefix = UrlBuilder.getHexPrefix(hash);
		const urlOrError = Url.create(
			`${this.historyArchiveBaseUrl.value}/bucket${prefix}/bucket-${hash}.xdr.gz`
		);
		if (urlOrError.isErr()) throw urlOrError.error;

		return urlOrError.value;
	}

	private getUrl(
		category: 'results' | 'history' | 'transactions' | 'ledger',
		extension: '.xdr.gz' | '.json'
	) {
		const urlResult = UrlBuilder.getCategoryUrl(
			this.historyArchiveBaseUrl,
			this.ledger,
			category,
			extension
		);
		if (urlResult.isErr()) throw urlResult.error; //should not happen

		return urlResult.value;
	}
}
