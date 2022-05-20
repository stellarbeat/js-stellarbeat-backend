import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { HistoryArchiveScan } from './HistoryArchiveScan';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { Url } from '../../../shared/domain/Url';
import { UrlBuilder } from '../UrlBuilder';
import { Category } from '../history-archive/Category';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import {
	FileNotFoundError,
	HttpQueue,
	QueueError,
	QueueUrl
} from '../HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';
import * as http from 'http';
import * as https from 'https';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { HttpError } from '../../../shared/services/HttpService';

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
		private checkPointGenerator: CheckPointGenerator,
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async perform(
		historyArchiveScan: HistoryArchiveScan
	): Promise<Result<HistoryArchiveScan, Error>> {
		const checkPointChunkSize = 1000000;
		let currentFromLedger = historyArchiveScan.fromLedger;
		let currentToLedger =
			currentFromLedger + checkPointChunkSize < historyArchiveScan.toLedger
				? currentFromLedger + checkPointChunkSize
				: historyArchiveScan.toLedger;

		let result: Result<void, Error> | null = null;
		let gapFound = false;

		while (
			currentFromLedger < historyArchiveScan.toLedger &&
			historyArchiveScan.concurrency > 0 &&
			!gapFound
		) {
			result = await this.scanRange(
				historyArchiveScan,
				currentToLedger,
				currentFromLedger
			);

			if (result.isErr()) {
				console.log(result.error);
				if (result.error instanceof FileNotFoundError) {
					gapFound = true;
				} else {
					historyArchiveScan.lowerConcurrency();
					await asyncSleep(5000); //let server cool off
				}
			} else {
				currentFromLedger += checkPointChunkSize;
				currentToLedger =
					currentFromLedger + checkPointChunkSize < historyArchiveScan.toLedger
						? currentFromLedger + checkPointChunkSize
						: historyArchiveScan.toLedger;
			}
		}

		if (!result) return err(new Error('Invalid range'));

		if (result.isErr()) {
			if (result.error instanceof FileNotFoundError) {
				historyArchiveScan.markGap(
					result.error.queueUrl.url,
					new Date(),
					currentToLedger - checkPointChunkSize > 0
						? currentToLedger - checkPointChunkSize
						: 0,
					result.error.queueUrl.meta.checkPoint
				);
			} else if (result.error instanceof QueueError) {
				historyArchiveScan.markError(
					result.error.queueUrl.url,
					new Date(),
					currentToLedger - checkPointChunkSize > 0
						? currentToLedger - checkPointChunkSize
						: 0,
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
			} else {
				return err(result.error);
			}
		} else {
			historyArchiveScan.markCompleted(new Date());
		}

		return ok(historyArchiveScan);
	}

	private async scanRange(
		historyArchiveScan: HistoryArchiveScan,
		toLedger: number,
		fromLedger = 0
	): Promise<Result<void, Error>> {
		this.logger.info('Starting scan', {
			history: historyArchiveScan.baseUrl.value,
			toLedger: toLedger,
			fromLedger: fromLedger,
			concurrency: historyArchiveScan.concurrency
		});

		console.time('chunkScan');
		const historyArchive = new HistoryArchive();
		const httpAgent = new http.Agent({
			keepAlive: true,
			maxSockets: historyArchiveScan.concurrency,
			maxFreeSockets: historyArchiveScan.concurrency,
			scheduling: 'fifo'
		});
		const httpsAgent = new https.Agent({
			keepAlive: true,
			maxSockets: historyArchiveScan.concurrency,
			maxFreeSockets: historyArchiveScan.concurrency,
			scheduling: 'fifo'
		});
		//this.logger.info(`Scanning ${checkPoints.length} checkpoints`);
		this.logger.info('Fetching history archive state (HAS) files');
		const historyArchiveStateURLGenerator =
			HistoryArchiveScanner.generateHASFetchUrls(
				historyArchiveScan.baseUrl,
				this.checkPointGenerator.generate(fromLedger, toLedger)
			);

		const historyArchiveStateFilesResult = await this.httpQueue.get(
			historyArchiveStateURLGenerator,
			(result: Record<string, unknown>) => {
				const validateHASResult = this.hasValidator.validate(result);
				if (validateHASResult.isOk()) {
					historyArchive.addBucketHashes(validateHASResult.value);
				} else {
					return validateHASResult.error;
				}
			},
			historyArchiveScan.concurrency,
			httpAgent,
			httpsAgent,
			true
		);

		if (historyArchiveStateFilesResult.isErr()) {
			return err(historyArchiveStateFilesResult.error);
			//break off and store failed scan result;
		}

		this.logger.info(
			'Checking if bucket files are present: ' +
				historyArchive.bucketHashes.length
		);
		const bucketsExistResult = await this.httpQueue.exists<BucketUrlMeta>(
			HistoryArchiveScanner.generateBucketQueueUrls(
				historyArchive,
				historyArchiveScan.baseUrl
			),
			historyArchiveScan.concurrency,
			httpAgent,
			httpsAgent
		);
		if (bucketsExistResult.isErr()) return err(bucketsExistResult.error);

		const generateCategoryQueueUrls =
			HistoryArchiveScanner.generateCategoryQueueUrls(
				this.checkPointGenerator.generate(fromLedger, toLedger),
				historyArchiveScan.baseUrl
			);

		this.logger.info('Checking if other category files are present: ');
		const categoriesExistResult = await this.httpQueue.exists<CategoryUrlMeta>(
			generateCategoryQueueUrls,
			historyArchiveScan.concurrency,
			httpAgent,
			httpsAgent
		);
		if (categoriesExistResult.isErr()) return err(categoriesExistResult.error);

		httpAgent.destroy();
		httpsAgent.destroy();

		console.timeEnd('chunkScan');

		return ok(undefined);
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

	private static *generateCategoryQueueUrls(
		checkPointGenerator: IterableIterator<number>,
		historyArchiveBaseUrl: Url
	): IterableIterator<QueueUrl<CategoryUrlMeta>> {
		for (const checkPoint of checkPointGenerator) {
			for (const category of [
				Category.ledger,
				Category.results,
				Category.transactions
			]) {
				yield {
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
}
