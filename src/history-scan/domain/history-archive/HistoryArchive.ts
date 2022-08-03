import { HistoryArchiveState } from './HistoryArchiveState';
import { HASBucketHashExtractor } from './HASBucketHashExtractor';
import { Url } from '../../../shared/domain/Url';

//data structure used when scanning a history archive
export class HistoryArchive {
	public bucketHashes: Set<string> = new Set<string>();

	constructor(public readonly baseUrl: Url) {}

	/*	addBucketHashes(historyArchiveState: HistoryArchiveState) {
		HASBucketHashExtractor.getNonZeroHashes(historyArchiveState).forEach(
			(hash) => this._bucketHashes.add(hash)
		);
	}

	get bucketHashes(): string[] {
		return Array.from(this._bucketHashes);
	}

 */
}
