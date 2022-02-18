import { CheckPointScanner } from './CheckPointScanner';
import { HistoryArchive } from './HistoryArchive';
import { CheckPointScan } from './CheckPointScan';
import { inject, injectable } from 'inversify';
import { queue } from 'async';
import { HistoryService } from '../../network/services/HistoryService';
import { Logger } from '../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';

@injectable()
export class HistoryArchiveScanner {
	constructor(
		private checkPointScanner: CheckPointScanner,
		private historyService: HistoryService,
		@inject('Logger') private logger: Logger
	) {}

	async scan(
		historyArchive: HistoryArchive,
		scanDate: Date = new Date(),
		concurrency = 50
	) {
		const latestLedgerOrError =
			await this.historyService.fetchStellarHistoryLedger(
				historyArchive.baseUrl.value
			);
		if (latestLedgerOrError.isErr()) {
			return latestLedgerOrError.error;
		}

		await this.scanRange(
			historyArchive,
			scanDate,
			latestLedgerOrError.value,
			concurrency
		);
	}

	async scanRange(
		historyArchive: HistoryArchive,
		scanDate: Date,
		toLedger: number,
		fromLedger = 0,
		concurrency = 50
	) {
		this.logger.info('Starting scan', {
			history: historyArchive.baseUrl.value,
			toLedger: toLedger,
			fromLedger: fromLedger
		});
		const historyArchiveScan = HistoryArchiveScan.create(
			scanDate,
			historyArchive.baseUrl,
			fromLedger,
			toLedger
		);
		console.time('scan');
		console.time('fullScan');
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
		}, concurrency);

		q.error(function (err, task) {
			console.error('task experienced an error');
		});

		q.drain(function () {
			console.timeEnd('scan');
			console.timeEnd('fullScan');
			console.log('all items have been processed');
			//todo: if gaps store in db, if error report through sentry. Do we want to show errors to end users?
		});

		let checkPoint = historyArchive.getCheckPointAt(fromLedger);
		while (checkPoint.ledger <= toLedger) {
			const checkPointScan = new CheckPointScan(checkPoint);
			checkPointScans.add(checkPointScan);
			q.push(checkPointScan);
			checkPoint = historyArchive.getNextCheckPoint(checkPoint);
		}

		await q.drain();

		historyArchiveScan.addCheckPointGaps(
			Array.from(checkPointScans)
				.filter((checkPointScan) => checkPointScan.hasGaps())
				.map((checkPointScan) => checkPointScan.checkPoint.ledger)
		);
		historyArchiveScan.addCheckPointErrors(
			Array.from(checkPointScans)
				.filter((checkPointScan) => checkPointScan.hasErrors())
				.map((checkPointScan) => checkPointScan.checkPoint.ledger)
		);

		historyArchiveScan.endDate = new Date();

		console.log(
			Array.from(checkPointScans).filter(
				(checkPointScan) =>
					checkPointScan.hasGaps() || checkPointScan.hasErrors()
			)
		);

		return historyArchiveScan;
	}
}
