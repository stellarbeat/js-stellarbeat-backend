import * as workerpool from 'workerpool';
import { gunzipSync } from 'zlib';
import { createHash } from 'crypto';
import { isMainThread } from 'worker_threads';
import { xdr } from 'stellar-base';

type Ledger = number;

function unzipAndHash(zip: ArrayBuffer) {
	const unzipped = gunzipSync(zip);
	const hashSum = createHash('sha256');
	hashSum.update(unzipped);
	return hashSum.digest('hex');
}

function unzipAndHashTransactionResults(zip: ArrayBuffer): Map<Ledger, string> {
	const map = new Map<number, string>();
	let xdrBuffers: Buffer = Buffer.from([]);
	try {
		xdrBuffers = gunzipSync(zip);
	} catch (e) {
		//weird stuff when archive is empty, try throwing an error or returning something...
	}
	if (xdrBuffers.length === 0) return map;

	do {
		const length = getMessageLengthFromXDRBuffer(xdrBuffers);
		if (length > xdrBuffers.length) {
			throw new Error('Corrupt xdr file');
		}
		let xdrBuffer: Buffer;
		[xdrBuffer, xdrBuffers] = getXDRBuffer(xdrBuffers, length);
		const transactionResult =
			xdr.TransactionHistoryResultEntry.fromXDR(xdrBuffer);
		const hashSum = createHash('sha256');
		hashSum.update(xdrBuffers);
		map.set(transactionResult.ledgerSeq(), hashSum.digest('hex'));
	} while (getMessageLengthFromXDRBuffer(xdrBuffers) > 0);
	return map;
}

//weird behaviour, di loads this worker file without referencing it
if (!isMainThread) {
	workerpool.worker({
		unzipAndHash: unzipAndHash,
		unzipAndHashTransactionResults: unzipAndHashTransactionResults
	});
}

function getMessageLengthFromXDRBuffer(buffer: Buffer): number {
	if (buffer.length < 4) return 0;

	const length = buffer.slice(0, 4);
	length[0] &= 0x7f; //clear xdr continuation bit
	return length.readUInt32BE(0);
}

function getXDRBuffer(buffer: Buffer, messageLength: number): [Buffer, Buffer] {
	return [buffer.slice(4, messageLength + 4), buffer.slice(4 + messageLength)];
}
