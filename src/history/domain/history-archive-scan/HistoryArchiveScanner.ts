import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { HistoryService } from '../../../network-update/domain/HistoryService';
import { Logger } from '../../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { Url } from '../../../shared/domain/Url';
import { UrlBuilder } from '../UrlBuilder';
import { Category } from '../history-archive/Category';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import { FetchResult, HttpQueue, QueueUrl } from '../HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';

type HistoryArchiveStateUrlMeta = {
	checkPoint: number;
};

type CategoryUrlMeta = {
	checkPoint: number;
	category: Category;
};

type BucketUrlMeta = {
	hash: string;
};

@injectable()
export class HistoryArchiveScanner {
	constructor(
		private historyService: HistoryService,
		private checkPointGenerator: CheckPointGenerator,
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue,
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

		//this.logger.info(`Scanning ${checkPoints.length} checkpoints`);
		this.logger.info('Fetching history archive state (HAS) files');
		const historyArchiveStateURLGenerator =
			HistoryArchiveScanner.generateHASFetchUrls(
				historyArchiveBaseUrl,
				this.checkPointGenerator.generate(fromLedger, toLedger)
			);

		const historyArchiveStateFilesResult = await this.httpQueue.fetch(
			historyArchiveStateURLGenerator,
			concurrency
		);

		if (historyArchiveStateFilesResult.isErr()) {
			throw historyArchiveStateFilesResult.error;
			//break off and store failed scan result;
		} else {
			const processResult = this.processBucketHashes(
				historyArchiveStateFilesResult.value,
				historyArchive
			);
			if (processResult.isErr()) {
				throw processResult.error;
				//break off and store failed scan result;
			}
		}

		const generateCategoryQueueUrls = this.generateCategoryQueueUrls(
			this.checkPointGenerator.generate(fromLedger, toLedger),
			historyArchiveBaseUrl
		);

		this.logger.info('Checking if other category files are present: ');
		const categoriesExistResult = await this.httpQueue.exists<CategoryUrlMeta>(
			generateCategoryQueueUrls,
			concurrency
		);
		if (categoriesExistResult.isErr()) throw categoriesExistResult.error;

		this.logger.info(
			'Checking if bucket files are present: ' +
				historyArchive.bucketHashes.length
		);
		const bucketsExistResult = await this.httpQueue.exists<BucketUrlMeta>(
			HistoryArchiveScanner.generateBucketQueueUrls(
				historyArchive,
				historyArchiveBaseUrl
			),
			concurrency
		);
		if (bucketsExistResult.isErr()) throw bucketsExistResult.error;

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
		console.timeEnd('fullScan');

		return ok(historyArchiveScanResult);
	}

	private static *generateBucketQueueUrls(
		historyArchive: HistoryArchive,
		historyArchiveBaseUrl: Url
	): IterableIterator<QueueUrl<BucketUrlMeta>> {
		for (const hash of historyArchive.bucketHashes) {
			yield {
				url: UrlBuilder.getBucketUrl(historyArchiveBaseUrl, hash),
				meta: {
					hash: hash
				}
			};
		}
	}

	private *generateCategoryQueueUrls(
		checkPointGenerator: IterableIterator<number>,
		historyArchiveBaseUrl: Url
	): IterableIterator<QueueUrl<CategoryUrlMeta>> {
		for (const checkPoint of checkPointGenerator) {
			for (const category of [
				Category.ledger,
				Category.results,
				Category.transactions
			]) {
				yield this.getCategoryFetchUrl(
					category,
					checkPoint,
					historyArchiveBaseUrl
				);
			}
		}
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

	private static *generateHASFetchUrls(
		historyArchiveBaseUrl: Url,
		checkPointGenerator: IterableIterator<number>
	): IterableIterator<QueueUrl<HistoryArchiveStateUrlMeta>> {
		for (const checkPoint of checkPointGenerator) {
			yield {
				url: UrlBuilder.getCategoryUrl(
					historyArchiveBaseUrl,
					checkPoint,
					Category.history
				),
				meta: {
					checkPoint: checkPoint
				}
			};
		}
	}

	private getCategoryFetchUrl(
		category: Category,
		checkPoint: number,
		historyArchiveBaseUrl: Url
	): QueueUrl<CategoryUrlMeta> {
		return {
			url: UrlBuilder.getCategoryUrl(
				historyArchiveBaseUrl,
				checkPoint,
				category
			),
			meta: {
				category: category,
				checkPoint: checkPoint
			}
		};
	}
}
