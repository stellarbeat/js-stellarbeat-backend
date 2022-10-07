import { Url } from '../../../shared/domain/Url';
import { Request, RequestMethod } from '../HttpQueue';
import { UrlBuilder } from '../UrlBuilder';
import { Category } from '../history-archive/Category';

export type HASRequestMeta = {
	checkPoint: number;
};

export type CategoryRequestMeta = {
	checkPoint: number;
	category: Category;
};

export type BucketRequestMeta = {
	hash: string;
};

export class RequestGenerator {
	static *generateBucketRequests(
		bucketHashes: Set<string>,
		baseUrl: Url,
		requestMethod: RequestMethod
	): IterableIterator<Request<BucketRequestMeta>> {
		for (const hash of bucketHashes) {
			yield {
				url: UrlBuilder.getBucketUrl(baseUrl, hash),
				meta: {
					hash: hash
				},
				method: requestMethod
			};
		}
	}

	static *generateCategoryRequests(
		checkPointGenerator: IterableIterator<number>,
		historyArchiveBaseUrl: Url,
		requestMethod: RequestMethod,
		categories = [Category.ledger, Category.results, Category.transactions]
	): IterableIterator<Request<CategoryRequestMeta>> {
		for (const checkPoint of checkPointGenerator) {
			for (const category of categories) {
				yield {
					url: UrlBuilder.getCategoryUrl(
						historyArchiveBaseUrl,
						checkPoint,
						category
					),
					meta: {
						category: category,
						checkPoint: checkPoint
					},
					method: requestMethod
				};
			}
		}
	}

	static *generateHASRequests(
		historyArchiveBaseUrl: Url,
		checkPointGenerator: IterableIterator<number>,
		requestMethod: RequestMethod
	): IterableIterator<Request<HASRequestMeta>> {
		for (const checkPoint of checkPointGenerator) {
			yield {
				url: UrlBuilder.getCategoryUrl(
					historyArchiveBaseUrl,
					checkPoint,
					Category.history
				),
				meta: {
					checkPoint: checkPoint
				},
				method: requestMethod
			};
		}
	}
}
