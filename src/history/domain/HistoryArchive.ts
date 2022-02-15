import { Url } from '../../shared/domain/Url';
import { CheckPoint } from './CheckPoint';

export class HistoryArchive {
	constructor(public readonly baseUrl: Url) {}

	getCheckPointAt(ledger: number) {
		return new CheckPoint(ledger, this.baseUrl);
	}

	getNextCheckPoint(checkPoint: CheckPoint) {
		return new CheckPoint(checkPoint.ledger + 64, this.baseUrl);
	}

	getHASUrl() {
		const urlOrError = Url.create(
			this.baseUrl + '/.well-known/stellar-history.json'
		);
		if (urlOrError.isErr()) throw urlOrError.error; // should not happen

		return urlOrError.value;
	}
}
