import { CheckPointGenerator } from './check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { HistoryService } from '../../network-update/domain/HistoryService';
import { Logger } from '../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../shared/services/ExceptionLogger';
import { Url } from '../../shared/domain/Url';
import { UrlBuilder } from './UrlBuilder';
import { HistoryArchive } from './HistoryArchive';
import {
	FetchResult,
	FetchUrl,
	FileNotFoundError,
	HttpQueue,
	QueueFetchError
} from './HttpQueue';
import { HASValidator } from './HASValidator';

type HistoryArchiveStateUrlMeta = {
	checkPoint: number;
};

@injectable()
export class HistoryArchiveScanner {
	constructor(
		private historyService: HistoryService,
		private checkPointGenerator: CheckPointGenerator,
		private hasValidator: HASValidator,
		private hasFetchQueue: HttpQueue,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async scan(
		historyArchiveBaseUrl: Url,
		scanDate: Date = new Date(),
		concurrency = 50,
		fromLedger = 0,
		toLedger?: number
	): Promise<Result<HistoryArchiveScan, Error>> {
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
	): Promise<Result<HistoryArchiveScan, Error>> {
		this.logger.info('Starting scan', {
			history: historyArchiveBaseUrl.value,
			toLedger: toLedger,
			fromLedger: fromLedger
		});

		console.time('fullScan');
		const historyArchive = new HistoryArchive();
		const checkPoints = this.checkPointGenerator.getCheckPoints(
			fromLedger,
			toLedger
		);
		this.logger.info(`Scanning ${checkPoints.length} checkpoints`);
		this.logger.info('Fetching history archive state (HAS) files');
		const historyArchiveStateURLs: FetchUrl<HistoryArchiveStateUrlMeta>[] =
			checkPoints.map(this.mapCheckPointToHASFetchUrl(historyArchiveBaseUrl));

		const historyArchiveStateFilesResult = await this.hasFetchQueue.fetch(
			historyArchiveStateURLs,
			concurrency
		);

		if (historyArchiveStateFilesResult.isErr()) {
			//break off and store failed scan result;
		} else {
			const processResult = this.processBucketHashes(
				historyArchiveStateFilesResult.value,
				historyArchive
			);
			if (processResult.isErr()) {
				//break off and store failed scan result;
			}
		}

		const historyArchiveScanResult = HistoryArchiveScan.create(
			scanDate,
			new Date(),
			historyArchiveBaseUrl,
			fromLedger,
			toLedger
		);
		/*
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
        
         */
		return ok(historyArchiveScanResult);
	}

	private processBucketHashes(
		historyArchiveStateFilesFetchResults: FetchResult<HistoryArchiveStateUrlMeta>[],
		historyArchive: HistoryArchive
	): Result<void, Error> {
		for (let i = 0; i < historyArchiveStateFilesFetchResults.length; i++) {
			const historyStateFileResult = historyArchiveStateFilesFetchResults[i];
			const validateHASResult = this.hasValidator.validate(
				historyStateFileResult.data
			);
			if (validateHASResult.isOk())
				historyArchive.addBucketHashes(validateHASResult.value);
			else {
				//wrap up and store failed scan result
				return err(validateHASResult.error);
			}
		}

		return ok(undefined);
	}

	private mapCheckPointToHASFetchUrl(historyArchiveBaseUrl: Url) {
		return (checkPoint: number) => {
			return {
				url: UrlBuilder.getCategoryUrl(
					historyArchiveBaseUrl,
					checkPoint,
					'history'
				),
				meta: {
					checkPoint: checkPoint
				}
			};
		};
	}
}
