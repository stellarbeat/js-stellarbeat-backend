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
}
