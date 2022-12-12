import { HistoryArchiveState } from './HistoryArchiveState';
import { createHash } from 'crypto';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';

export function hashBucketList(
	historyArchiveState: HistoryArchiveState
): Result<
	{
		ledger: number;
		hash: string;
	},
	Error
> {
	try {
		const bucketListHash = createHash('sha256');
		historyArchiveState.currentBuckets.forEach((bucket) => {
			const bucketHash = createHash('sha256');
			bucketHash.write(Buffer.from(bucket.curr, 'hex'));
			bucketHash.write(Buffer.from(bucket.snap, 'hex'));
			bucketListHash.write(bucketHash.digest());
		});

		return ok({
			ledger: historyArchiveState.currentLedger,
			hash: bucketListHash.digest().toString('base64')
		});
	} catch (e) {
		console.log(e);
		return err(mapUnknownToError(e));
	}
}
