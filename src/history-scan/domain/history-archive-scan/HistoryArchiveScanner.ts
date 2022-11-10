import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';
import { ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { HistoryArchiveRangeScanner } from './HistoryArchiveRangeScanner';
import { ScanError } from './ScanError';

export interface LedgerHeaderHash {
	ledger: number;
	hash: string;
}

@injectable()
export class HistoryArchiveScanner {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private historyArchiveRangeScanner: HistoryArchiveRangeScanner,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async perform(
		historyArchiveScan: HistoryArchiveScan
	): Promise<Result<HistoryArchiveScan, Error>> {
		this.logger.info('Starting scan', {
			history: historyArchiveScan.baseUrl.value,
			toLedger: historyArchiveScan.toLedger,
			fromLedger: historyArchiveScan.fromLedger
		});

		console.time('scan');
		const result = await this.scanInChunks(historyArchiveScan);
		console.timeEnd('scan');

		if (result.isErr()) {
			historyArchiveScan.scanError = result.error; //todo: more explicit
		} else {
			historyArchiveScan.markCompleted(new Date());
		}

		return ok(historyArchiveScan);
	}

	private async scanInChunks(
		historyArchiveScan: HistoryArchiveScan
	): Promise<Result<LedgerHeaderHash | void, ScanError>> {
		let currentFromLedger = historyArchiveScan.fromLedger;
		let currentToLedger =
			currentFromLedger + historyArchiveScan.chunkSize <
			historyArchiveScan.toLedger
				? currentFromLedger + historyArchiveScan.chunkSize
				: historyArchiveScan.toLedger;

		let result: Result<LedgerHeaderHash | void, ScanError> | null = null;
		let errorFound = false;

		while (currentFromLedger < historyArchiveScan.toLedger && !errorFound) {
			console.time('chunk');
			result = await this.historyArchiveRangeScanner.scan(
				historyArchiveScan.baseUrl,
				historyArchiveScan.maxConcurrency,
				currentToLedger,
				currentFromLedger,
				historyArchiveScan.latestScannedLedger,
				historyArchiveScan.latestScannedLedgerHeaderHash
			);
			console.timeEnd('chunk');

			if (result.isErr()) {
				errorFound = true;
			} else {
				if (result.value !== undefined) {
					historyArchiveScan.latestScannedLedger = result.value.ledger;
					historyArchiveScan.latestScannedLedgerHeaderHash = result.value.hash;
				} else historyArchiveScan.latestScannedLedger = currentToLedger;
				currentFromLedger += historyArchiveScan.chunkSize;
				currentToLedger =
					currentFromLedger + historyArchiveScan.chunkSize <
					historyArchiveScan.toLedger
						? currentFromLedger + historyArchiveScan.chunkSize
						: historyArchiveScan.toLedger;
			}
		}

		if (!result) throw new Error('Invalid parameters for chunk scan'); //should not happen, todo: better code structure

		return result;
	}
}
