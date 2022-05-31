import { HistoryArchive } from './history-archive/HistoryArchive';
import { Url } from '../../shared/domain/Url';
import { QueueUrl } from './HttpQueue';
import {
	BucketUrlMeta,
	CategoryUrlMeta,
	HistoryArchiveStateUrlMeta,
	UrlBuilder
} from './UrlBuilder';
import { Category } from './history-archive/Category';

export class UrlGenerator {
	static *generateBucketQueueUrls(
		historyArchive: HistoryArchive
	): IterableIterator<QueueUrl<BucketUrlMeta>> {
		for (const hash of historyArchive.bucketHashes) {
			yield {
				url: UrlBuilder.getBucketUrl(historyArchive.baseUrl, hash),
				meta: {
					hash: hash
				}
			};
		}
	}

	static *generateCategoryQueueUrls(
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

	static *generateHASFetchUrls(
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
