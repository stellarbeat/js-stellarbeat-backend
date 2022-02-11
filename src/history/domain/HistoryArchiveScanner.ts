import { CheckPointScanner } from './CheckPointScanner';
import { HistoryArchive } from './HistoryArchive';
import { CheckPointScan } from './CheckPointScan';
import { injectable } from 'inversify';
import { queue } from 'async';

@injectable()
export class HistoryArchiveScanner {
	constructor(private checkPointScanner: CheckPointScanner) {}

	async scan(
		historyArchive: HistoryArchive,
		scanDate: Date,
		toLedger: number,
		fromLedger = 0
	) {
		console.time('scan');
		const checkPointScans: Set<CheckPointScan> = new Set<CheckPointScan>();
		const q = queue(async (checkPointScan: CheckPointScan, callback) => {
			//retry same checkpoint if timeout and less than tree attempts
			let scan = true;
			while (scan) {
				await this.checkPointScanner.scan(checkPointScan);
				if (!checkPointScan.hasErrors() || checkPointScan.attempt >= 3)
					scan = false;
			}

			callback();
		}, 50);

		q.error(function (err, task) {
			console.error('task experienced an error');
		});

		q.drain(function () {
			console.timeEnd('scan');
			console.log('all items have been processed');
			console.log(
				Array.from(checkPointScans).filter(
					(checkPointScan) =>
						checkPointScan.hasGaps() || checkPointScan.hasErrors()
				)
			);
		});

		let checkPoint = historyArchive.getCheckPointAt(fromLedger);
		while (checkPoint.ledger <= toLedger) {
			const checkPointScan = new CheckPointScan(checkPoint);
			checkPointScans.add(checkPointScan);
			q.push(checkPointScan);
			checkPoint = historyArchive.getNextCheckPoint(checkPoint);
		}

		await q.drain();
	}
}
