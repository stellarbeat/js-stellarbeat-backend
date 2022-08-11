import { err, ok, Result } from 'neverthrow';
import {
	CategoryRequestMeta,
	HASRequestMeta,
	RequestGenerator
} from './RequestGenerator';
import {
	FileNotFoundError,
	HttpQueue,
	QueueError,
	RequestMethod
} from '../HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';
import { injectable } from 'inversify';
import { Url } from '../../../shared/domain/Url';
import { ScanError } from './HistoryArchiveScanner';
import { GapFoundError } from './GapFoundError';
import { HASBucketHashExtractor } from '../history-archive/HASBucketHashExtractor';
import * as http from 'http';
import * as https from 'https';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';
import { isObject } from '../../../shared/utilities/TypeGuards';

@injectable()
export class CategoryScanner {
	constructor(
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue
	) {}

	//fetches all HAS files in checkpoint range and returns all detected bucket urls
	public async scanHASFilesAndReturnBucketHashes(
		historyBaseUrl: Url,
		checkPoints: IterableIterator<number>,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<Set<string>, GapFoundError | ScanError>> {
		const historyArchiveStateURLGenerator =
			RequestGenerator.generateHASRequests(
				historyBaseUrl,
				checkPoints,
				RequestMethod.GET
			);

		const bucketHashes = new Set<string>();
		const successOrError = await this.httpQueue.sendRequests(
			historyArchiveStateURLGenerator,
			{
				stallTimeMs: 150,
				concurrency: concurrency,
				nrOfRetries: 5,
				rampUpConnections: true,
				httpOptions: {
					httpAgent: httpAgent,
					httpsAgent: httpsAgent,
					responseType: 'json',
					timeoutMs: 10000
				}
			},
			async (result: unknown, request) => {
				if (!isObject(result)) {
					return new FileNotFoundError(request);
				}
				const validateHASResult = this.hasValidator.validate(result);
				if (validateHASResult.isOk()) {
					HASBucketHashExtractor.getNonZeroHashes(
						validateHASResult.value
					).forEach((hash) => bucketHashes.add(hash));
				} else {
					return new QueueError<HASRequestMeta>(
						request,
						validateHASResult.error
					);
				}
			}
		);

		if (successOrError.isErr()) {
			return err(
				mapHttpQueueErrorToScanError(
					successOrError.error,
					successOrError.error.request.meta.checkPoint
				)
			);
		}

		return ok(bucketHashes);
	}

	async scanOtherCategories(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		verify = false
	): Promise<Result<void, GapFoundError | ScanError>> {
		if (!verify)
			return await this.otherCategoriesExist(
				baseUrl,
				concurrency,
				checkPoints,
				httpAgent,
				httpsAgent
			);

		return await this.verifyOtherCategories(
			baseUrl,
			concurrency,
			checkPoints,
			httpAgent,
			httpsAgent
		);
	}

	private async verifyOtherCategories(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		return ok(undefined);
	}
	private async otherCategoriesExist(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		const generateCategoryQueueUrls = RequestGenerator.generateCategoryRequests(
			checkPoints,
			baseUrl,
			RequestMethod.HEAD
		);

		const categoriesExistResult =
			await this.httpQueue.sendRequests<CategoryRequestMeta>(
				generateCategoryQueueUrls,
				{
					stallTimeMs: 150,
					concurrency: concurrency,
					nrOfRetries: 5,
					rampUpConnections: true,
					httpOptions: {
						responseType: undefined,
						timeoutMs: 10000,
						httpAgent: httpAgent,
						httpsAgent: httpsAgent
					}
				}
			);

		if (categoriesExistResult.isErr()) {
			return err(
				mapHttpQueueErrorToScanError(
					categoriesExistResult.error,
					categoriesExistResult.error.request.meta.checkPoint
				)
			);
		}

		return ok(undefined);
	}
}
