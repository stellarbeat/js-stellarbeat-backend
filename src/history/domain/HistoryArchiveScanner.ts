import { CheckPointScanner } from './CheckPointScanner';
import { HistoryArchive } from './HistoryArchive';
import { CheckPointScan } from './CheckPointScan';
import { inject, injectable } from 'inversify';
import { queue } from 'async';
import { HistoryService } from '../../network/services/HistoryService';
import { Logger } from '../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../shared/services/ExceptionLogger';

@injectable()
export class HistoryArchiveScanner {
	constructor(
		private checkPointScanner: CheckPointScanner,
		private historyService: HistoryService,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async scan(
		historyArchive: HistoryArchive,
		scanDate: Date = new Date(),
		concurrency = 50,
		fromLedger = 0,
		toLedger?: number
	): Promise<Result<HistoryArchiveScan, Error>> {
		if (!toLedger) {
			const latestLedgerOrError =
				await this.historyService.fetchStellarHistoryLedger(
					historyArchive.baseUrl.value
				);
			if (latestLedgerOrError.isErr()) {
				return err(latestLedgerOrError.error);
			}

			toLedger = latestLedgerOrError.value;
		}

		return await this.scanRange(
			historyArchive,
			scanDate,
			toLedger,
			fromLedger,
			concurrency
		);
	}

	async scanRange(
		historyArchive: HistoryArchive,
		scanDate: Date,
		toLedger: number,
		fromLedger = 0,
		concurrency = 50
	): Promise<Result<HistoryArchiveScan, Error>> {
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

		q.error((err, task) => {
			this.exceptionLogger.captureException(err);
		});

		q.drain(function () {
			console.timeEnd('scan');
			console.timeEnd('fullScan');
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
		console.log('done');
		this.logger.debug('Failed checkpoints', {
			cp: Array.from(checkPointScans)
				.filter(
					(checkPointScan) =>
						checkPointScan.hasGaps() || checkPointScan.hasErrors()
				)
				.toString()
		});

		return ok(historyArchiveScan);
	}
}
