import { UrlBuilder } from './UrlBuilder';
import { FetchError, UrlFetcher } from './UrlFetcher';
import { Url } from '../../shared/domain/Url';
import { inject, injectable } from 'inversify';
import { Logger } from '../../shared/services/PinoLogger';

export enum UrlScanStatus {
	present = 'present',
	missing = 'missing',
	error = 'error'
}

export interface BucketScanResult {
	hash: string;
	status: UrlScanStatus;
	error?: FetchError;
}

@injectable()
export class BucketScanner {
	constructor(
		protected urlFetcher: UrlFetcher,
		@inject('Logger') protected logger: Logger
	) {}

	async scanBuckets(
		hashes: string[],
		historyArchiveBaseUrl: Url,
		bucketCache: Map<string, boolean>
	): Promise<BucketScanResult[]> {
		const scanResults: BucketScanResult[] = [];
		const nonZeroHashes = hashes.filter(
			(hash) => !BucketScanner.isZeroHash(hash)
		);

		//we use for loop because we want to run one http query at a time. Concurrency is achieved by processing multiple checkpoints at the same time
		for (let index = 0; index < nonZeroHashes.length; index++) {
			const result = await this.scanBucket(
				nonZeroHashes[index],
				historyArchiveBaseUrl,
				bucketCache
			);
			scanResults.push(result);
		}

		return scanResults;
	}

	private async scanBucket(
		hash: string,
		historyArchiveBaseUrl: Url,
		bucketCache: Map<string, boolean>
	): Promise<BucketScanResult> {
		if (bucketCache.has(hash)) {
			return {
				hash: hash,
				status: bucketCache.get(hash)
					? UrlScanStatus.present
					: UrlScanStatus.missing
			};
		}

		const url = UrlBuilder.getBucketUrl(historyArchiveBaseUrl, hash);
		const result = await this.urlFetcher.exists(url);

		if (result.isOk()) {
			bucketCache.set(hash, result.value);
			if (result.value) {
				return {
					hash: hash,
					status: UrlScanStatus.present
				};
			} else
				return {
					status: UrlScanStatus.missing,
					hash: hash
				};
		} else {
			this.logger.debug(result.error.message, {
				responseStatus: result.error.cause.response?.status,
				hash: hash
			});
			return {
				hash: hash,
				status: UrlScanStatus.error,
				error: result.error
			};
		}
	}

	private static isZeroHash(hash: string) {
		return parseInt(hash, 16) === 0;
	}
}
