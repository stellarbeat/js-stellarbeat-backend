import { CheckPointScanner } from './CheckPointScanner';
import { HistoryArchive } from './HistoryArchive';
import { CheckPointScan } from './CheckPointScan';
import { injectable } from 'inversify';

@injectable()
export class HistoryArchiveScanner {
	constructor(private checkPointScanner: CheckPointScanner) {}

	async scan(
		historyArchive: HistoryArchive,
		scanDate: Date,
		toLedger: number,
		fromLedger = 0
	) {
		let checkPoint = historyArchive.getCheckPointAt(fromLedger);
		while (checkPoint.ledger <= toLedger) {
			const checkPointScan = new CheckPointScan(checkPoint);
			await this.checkPointScanner.scan(checkPointScan);
			console.log(checkPointScan);
			checkPoint = historyArchive.getNextCheckPoint(checkPoint);
		}
	}
}
