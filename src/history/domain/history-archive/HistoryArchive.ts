import { HistoryArchiveState } from './HistoryArchiveState';
import { HASBucketHashExtractor } from './HASBucketHashExtractor';

//data structure used when scanning a history archive
export class HistoryArchive {
	private _bucketHashes: Set<string> = new Set<string>();

	addBucketHashes(historyArchiveState: HistoryArchiveState) {
		HASBucketHashExtractor.getHashes(historyArchiveState).forEach((hash) =>
			this._bucketHashes.add(hash)
		);
	}

	get bucketHashes(): string[] {
		return Array.from(this._bucketHashes);
	}
}
