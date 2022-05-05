import { HistoryArchiveState } from './HistoryArchiveState';

export class HASBucketHashExtractor {
	static getNonZeroHashes(historyArchiveState: HistoryArchiveState): string[] {
		const bucketHashes: string[] = [];
		historyArchiveState.currentBuckets.forEach((bucket) => {
			bucketHashes.push(bucket.curr);
			bucketHashes.push(bucket.snap);

			const nextOutput = bucket.next.output;
			if (nextOutput) bucketHashes.push(nextOutput);
		});

		return bucketHashes.filter(
			(hash) => !HASBucketHashExtractor.isZeroHash(hash)
		);
	}

	private static isZeroHash(hash: string) {
		return parseInt(hash, 16) === 0;
	}
}
