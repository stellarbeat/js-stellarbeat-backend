import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';
import { ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { HttpError } from '../../../shared/services/HttpService';
import { Url } from '../../../shared/domain/Url';
import { CustomError } from '../../../shared/errors/CustomError';
import { GapFoundError } from './GapFoundError';
import { CategoryVerificationError } from './CategoryVerificationError';
import { UrlBuilder } from '../UrlBuilder';
import { HistoryArchiveRangeScanner } from './HistoryArchiveRangeScanner';

export interface LedgerHeaderHash {
	ledger: number;
	hash: string;
}

export class ScanError extends CustomError {
	constructor(
		public url: Url,
		cause: Error | undefined,
		public checkPoint?: number
	) {
		super('Error while scanning', ScanError.name, cause);
	}
}

//todo: extract http agents and concurrency into HttpQueueOptions
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
			if (result.error instanceof CategoryVerificationError) {
				this.logger.info(result.error.message, {
					ledger: result.error.ledger,
					category: result.error.category
				});
				console.log(
					UrlBuilder.getCategoryUrl(
						historyArchiveScan.baseUrl,
						this.checkPointGenerator.getClosestHigherCheckPoint(
							result.error.ledger
						),
						result.error.category
					)
				);
			}
			if (result.error instanceof GapFoundError) {
				this.logger.info(result.error.message, {
					url: result.error.url,
					checkPoint: result.error.checkPoint
				});
				historyArchiveScan.markGap(
					result.error.url,
					new Date(),
					result.error.checkPoint
				);
			} else if (result.error instanceof ScanError) {
				this.logger.info(result.error.message, {
					cause: result.error.cause?.message,
					url: result.error.url,
					checkPoint: result.error.checkPoint
				});
				historyArchiveScan.markError(
					result.error.url,
					new Date(),
					result.error.cause
						? result.error.cause.message
						: result.error.message,
					result.error.cause instanceof HttpError
						? result.error.cause.response?.status
						: undefined,
					result.error.cause instanceof HttpError
						? result.error.cause.code
						: undefined
				);
			}
		} else {
			historyArchiveScan.markCompleted(new Date());
		}

		return ok(historyArchiveScan);
	}

	private async scanInChunks(
		historyArchiveScan: HistoryArchiveScan
	): Promise<
		Result<
			LedgerHeaderHash | void,
			ScanError | GapFoundError | CategoryVerificationError
		>
	> {
		let currentFromLedger = historyArchiveScan.fromLedger;
		let currentToLedger =
			currentFromLedger + historyArchiveScan.chunkSize <
			historyArchiveScan.toLedger
				? currentFromLedger + historyArchiveScan.chunkSize
				: historyArchiveScan.toLedger;

		let result: Result<
			LedgerHeaderHash | void,
			GapFoundError | ScanError | CategoryVerificationError
		> | null = null;
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
