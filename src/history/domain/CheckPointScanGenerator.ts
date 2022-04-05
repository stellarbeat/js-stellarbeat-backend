import { Url } from '../../shared/domain/Url';
import { CheckPointScan } from './CheckPointScan';

export class CheckPointScanGenerator {
	static getCheckPointScanAt(ledger: number, historyArchiveBaseUrl: Url) {
		return new CheckPointScan(
			Math.floor((ledger + 64) / 64) * 64 - 1,
			historyArchiveBaseUrl
		);
	}

	static getNextCheckPointScan(checkPointScan: CheckPointScan) {
		return new CheckPointScan(
			checkPointScan.ledger + 64,
			checkPointScan.historyArchiveBaseUrl
		);
	}
}
