import { HistoryArchiveState } from './HistoryArchiveState';

export class HASBucketHashExtractor {
	static getHashes(historyArchiveState: HistoryArchiveState): string[] {
		const bucketUrls: string[] = [];
		historyArchiveState.currentBuckets.forEach((bucket) => {
			bucketUrls.push(bucket.curr);
			bucketUrls.push(bucket.snap);

			const nextOutput = bucket.next.output;
			if (nextOutput) bucketUrls.push(nextOutput);
		});

		return bucketUrls;
	}
}
