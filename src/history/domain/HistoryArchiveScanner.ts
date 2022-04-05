import { CheckPointScanner } from './CheckPointScanner';
import { CheckPointScanFactory } from './CheckPointScanFactory';
import { CheckPointScan } from './CheckPointScan';
import { inject, injectable } from 'inversify';
import { queue } from 'async';
import { HistoryService } from '../../network-update/domain/HistoryService';
import { Logger } from '../../shared/services/PinoLogger';
import { HistoryArchiveScanSummary } from './HistoryArchiveScanSummary';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../shared/services/ExceptionLogger';
import * as math from 'mathjs';
import { Url } from '../../shared/domain/Url';

@injectable()
export class HistoryArchiveScanner {
	constructor(
		private checkPointScanner: CheckPointScanner,
		private historyService: HistoryService,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async scan(
		historyArchiveBaseUrl: Url,
		scanDate: Date = new Date(),
		concurrency = 50,
		fromLedger = 0,
		toLedger?: number
	): Promise<Result<HistoryArchiveScanSummary, Error>> {
		if (!toLedger) {
			const latestLedgerOrError =
				await this.historyService.fetchStellarHistoryLedger(
					historyArchiveBaseUrl.value
				);
			if (latestLedgerOrError.isErr()) {
				return err(latestLedgerOrError.error);
			}

			toLedger = latestLedgerOrError.value;
		}

		return await this.scanRange(
			historyArchiveBaseUrl,
			scanDate,
			toLedger,
			fromLedger,
			concurrency
		);
	}

	async scanRange(
		historyArchiveBaseUrl: Url,
		scanDate: Date,
		toLedger: number,
		fromLedger = 0,
		concurrency = 50
	): Promise<Result<HistoryArchiveScanSummary, Error>> {
		this.logger.info('Starting scan', {
			history: historyArchiveBaseUrl.value,
			toLedger: toLedger,
			fromLedger: fromLedger
		});

		console.time('scan');
		console.time('fullScan');
		const checkPointScans: Set<CheckPointScan> = new Set<CheckPointScan>();
		const presentBucketScans = new Set<string>();
		let completedCheckPointScanCounter = 0;

		const doScan = async (checkPointScan: CheckPointScan) => {
			//retry same checkpoint if timeout and less than tree attempts
			let scan = true;
			while (scan) {
				await this.checkPointScanner.scan(checkPointScan, presentBucketScans);
				if (!checkPointScan.hasErrors() || checkPointScan.attempt >= 3)
					scan = false;
			}
			completedCheckPointScanCounter++;
			if (completedCheckPointScanCounter % 1000 === 0) {
				console.timeEnd('scan');
				console.time('scan');
				this.logger.info('Scanned 1000 checkpoints', {
					ledger: checkPointScan.ledger
				});
			}
		};

		let actualConcurrency = 1;
		//ramp up concurrency slowly to avoid tcp handshakes overloading server/client. Keepalive ensures we reuse the created connections.
		const concurrencyTimer = setInterval(() => {
			if (actualConcurrency < concurrency) {
				actualConcurrency++;
				q.concurrency = actualConcurrency;
			} else {
				clearInterval(concurrencyTimer);
			}
		}, 100);

		const q = queue(async (checkPointScan: CheckPointScan, callback) => {
			await doScan(checkPointScan);
			callback();
		}, actualConcurrency);

		q.error((err) => {
			this.exceptionLogger.captureException(err);
		});

		q.drain(function () {
			console.timeEnd('scan');
			console.timeEnd('fullScan');
			//todo: if gaps store in db, if error report through sentry. Do we want to show errors to end users?
		});

		let checkPoint = CheckPointScanFactory.createCheckPointScan(
			fromLedger,
			historyArchiveBaseUrl
		);

		while (checkPoint.ledger <= toLedger) {
			const checkPointScan = new CheckPointScan(
				checkPoint.ledger,
				historyArchiveBaseUrl
			);
			checkPointScans.add(checkPointScan);
			q.push(checkPointScan);
			checkPoint = CheckPointScanFactory.createNextCheckPointScan(checkPoint);
		}

		await q.drain();

		//this.checkPointScanner.shutdown();
		const historyArchiveScanResult = HistoryArchiveScanSummary.create(
			scanDate,
			new Date(),
			historyArchiveBaseUrl,
			fromLedger,
			toLedger,
			Array.from(checkPointScans)
		);

		console.log('done');
		this.logger.debug('Failed checkpoints', {
			cp: Array.from(checkPointScans)
				.filter(
					(checkPointScan) =>
						checkPointScan.hasGaps() || checkPointScan.hasErrors()
				)
				.toString()
		});

		console.log('Count', this.checkPointScanner.existsTimings.length);
		console.log('AVG', math.mean(this.checkPointScanner.existsTimings));
		// @ts-ignore
		console.log('STD', math.std(this.checkPointScanner.existsTimings));
		return ok(historyArchiveScanResult);
	}
}
