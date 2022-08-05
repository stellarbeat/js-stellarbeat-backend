import { err, ok, Result } from 'neverthrow';
import { RequestGenerator } from './RequestGenerator';
import { FileNotFoundError, HttpQueue } from '../HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';
import { injectable } from 'inversify';
import { Url } from '../../../shared/domain/Url';
import { ScanError } from './HistoryArchiveScanner';
import { GapFoundError } from './GapFoundError';
import { HASBucketHashExtractor } from '../history-archive/HASBucketHashExtractor';
import * as http from 'http';
import * as https from 'https';
import { CategoryUrlMeta } from '../UrlBuilder';

@injectable()
export class CategoryScanner {
	constructor(
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue
	) {}

	//fetches all HAS files in checkpoint range and returns all detected bucket urls
	//todo: check memory impact of returning HASfiles instead and extracting bucket hashes later, would make for cleaner code.
	public async scanHASFilesAndReturnBucketHashes(
		historyBaseUrl: Url,
		checkPoints: IterableIterator<number>,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<Set<string>, GapFoundError | ScanError>> {
		const historyArchiveStateURLGenerator =
			RequestGenerator.generateHASRequests(historyBaseUrl, checkPoints);

		const bucketHashes = new Set<string>();
		const successOrError = await this.httpQueue.get(
			historyArchiveStateURLGenerator,
			(result: Record<string, unknown>) => {
				const validateHASResult = this.hasValidator.validate(result);
				if (validateHASResult.isOk()) {
					HASBucketHashExtractor.getNonZeroHashes(
						validateHASResult.value
					).forEach((hash) => bucketHashes.add(hash));
				} else {
					return validateHASResult.error;
				}
			},
			concurrency,
			httpAgent,
			httpsAgent,
			true
		);

		if (successOrError.isErr()) {
			const error = successOrError.error;
			if (error instanceof FileNotFoundError) {
				return err(
					new GapFoundError(error.request.url, error.request.meta.checkPoint)
				);
			}
			return err(
				new ScanError(
					error.request.url,
					error.cause,
					error.request.meta.checkPoint
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
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		const generateCategoryQueueUrls = RequestGenerator.generateCategoryRequests(
			checkPoints,
			baseUrl
		);

		const categoriesExistResult = await this.httpQueue.exists<CategoryUrlMeta>(
			generateCategoryQueueUrls,
			concurrency,
			httpAgent,
			httpsAgent
		);
		if (categoriesExistResult.isErr()) {
			const error = categoriesExistResult.error;
			if (error instanceof FileNotFoundError) {
				return err(
					new GapFoundError(error.request.url, error.request.meta.checkPoint)
				);
			}
			return err(
				new ScanError(
					error.request.url,
					error.cause,
					error.request.meta.checkPoint
				)
			);
		}

		return ok(undefined);
	}
}
