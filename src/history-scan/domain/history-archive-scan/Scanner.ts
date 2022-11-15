import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { Scan } from './Scan';
import { ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { ScanError } from './ScanError';
import { RangeScanner, ScanResult } from './RangeScanner';

export interface LedgerHeaderHash {
	ledger: number;
	hash: string;
}

@injectable()
export class Scanner {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private historyArchiveRangeScanner: RangeScanner,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async scan(historyArchiveScan: Scan): Promise<Result<Scan, Error>> {
		this.logger.info('Starting scan', {
			history: historyArchiveScan.baseUrl.value,
			toLedger: historyArchiveScan.toLedger,
			fromLedger: historyArchiveScan.fromLedger
		});

		console.time('scan');
		const result = await this.scanInChunks(historyArchiveScan);
		console.timeEnd('scan');

		let error: ScanError | undefined;
		if (result.isErr()) {
			this.logger.info('error detected', {
				url: result.error.url,
				message: result.error.message
			});
			error = result.error;
		}

		historyArchiveScan.finish(new Date(), error);

		return ok(historyArchiveScan);
	}

	private async scanInChunks(
		historyArchiveScan: Scan
	): Promise<Result<ScanResult, ScanError>> {
		let currentFromLedger = historyArchiveScan.fromLedger;
		let currentToLedger =
			currentFromLedger + historyArchiveScan.chunkSize <
			historyArchiveScan.toLedger
				? currentFromLedger + historyArchiveScan.chunkSize
				: historyArchiveScan.toLedger;

		let result: Result<ScanResult, ScanError> | null = null;
		let errorFound = false;

		while (currentFromLedger < historyArchiveScan.toLedger && !errorFound) {
			result = await this.historyArchiveRangeScanner.scan(
				historyArchiveScan.baseUrl,
				historyArchiveScan.maxConcurrency,
				currentToLedger,
				currentFromLedger,
				historyArchiveScan.latestScannedLedger,
				historyArchiveScan.latestScannedLedgerHeaderHash
			);

			if (result.isErr()) {
				errorFound = true;
			} else {
				if (result.value.latestLedgerHeaderHash !== undefined) {
					historyArchiveScan.latestScannedLedger =
						result.value.latestLedgerHeaderHash.ledger;
					historyArchiveScan.latestScannedLedgerHeaderHash =
						result.value.latestLedgerHeaderHash.hash;
				} else {
					historyArchiveScan.latestScannedLedger = currentToLedger;
				}

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
