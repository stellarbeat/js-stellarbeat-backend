import * as workerpool from 'workerpool';
import { gunzipSync } from 'zlib';
import { createHash } from 'crypto';
import { isMainThread } from 'worker_threads';

function unzipAndHash(zip: ArrayBuffer) {
	const unzipped = gunzipSync(zip);
	const hashSum = createHash('sha256');
	hashSum.update(unzipped);
	return hashSum.digest('hex');
}

//weird behaviour, di loads this worker file without referencing it
if (!isMainThread) {
	workerpool.worker({
		unzipAndHash: unzipAndHash
	});
}
