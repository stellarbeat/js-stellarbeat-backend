import * as workerpool from 'workerpool';
import { gunzip } from 'zlib';
import { createHash } from 'crypto';
import { isMainThread } from 'worker_threads';
import { xdr } from 'stellar-base';

type Ledger = number;

async function unzipAndHash(zip: ArrayBuffer): Promise<string> {
	return new Promise((resolve, reject) => {
		gunzip(zip, (error, unzipped) => {
			if (error) reject(error);
			else {
				const hashSum = createHash('sha256');
				hashSum.update(unzipped);
				resolve(hashSum.digest('hex'));
			}
		});
	});
}

async function unzipLedgerHeaderHistoryEntries(
	zip: ArrayBuffer
): Promise<
	Map<Ledger, { transactionsHash: string; transactionResultsHash: string }>
> {
	return new Promise((resolve, reject) => {
		const map: Map<
			Ledger,
			{ transactionsHash: string; transactionResultsHash: string }
		> = new Map();
		gunzip(zip, (error, xdrBuffers) => {
			if (error) reject(error);
			else {
				do {
					const length = getMessageLengthFromXDRBuffer(xdrBuffers);
					if (length > xdrBuffers.length) {
						throw new Error('Corrupt xdr file');
					}
					let xdrBuffer: Buffer;
					[xdrBuffer, xdrBuffers] = getXDRBuffer(xdrBuffers, length);
					const ledgerHeaderHistoryEntry =
						xdr.LedgerHeaderHistoryEntry.fromXDR(xdrBuffer);
					map.set(ledgerHeaderHistoryEntry.header().ledgerSeq(), {
						transactionResultsHash: ledgerHeaderHistoryEntry
							.header()
							.txSetResultHash()
							.toString('base64'),
						transactionsHash: ledgerHeaderHistoryEntry
							.header()
							.scpValue()
							.txSetHash()
							.toString('base64')
					});
				} while (getMessageLengthFromXDRBuffer(xdrBuffers) > 0);
				resolve(map);
			}
		});
	});
}

async function unzipAndHashTransactionResultEntries(
	zip: Buffer
): Promise<Map<Ledger, string>> {
	return new Promise((resolve, reject) => {
		const map = new Map<number, string>();
		gunzip(zip, (error, xdrBuffers) => {
			if (error) reject(error);
			else if (xdrBuffers.length < 4) resolve(map);
			else {
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
					hashSum.update(transactionResult.txResultSet().toXDR());
					map.set(transactionResult.ledgerSeq(), hashSum.digest('base64'));
				} while (getMessageLengthFromXDRBuffer(xdrBuffers) > 0);
				resolve(map);
			}
		});
	});
}

function unzipAndHashTransactionEntries(
	zip: ArrayBuffer
): Promise<Map<Ledger, string>> {
	return new Promise((resolve, reject) => {
		const map = new Map<number, string>();
		gunzip(zip, (error, xdrBuffers) => {
			if (error) reject(error);
			else if (xdrBuffers.length < 4) resolve(map);
			else {
				do {
					const length = getMessageLengthFromXDRBuffer(xdrBuffers);
					if (length > xdrBuffers.length) {
						throw new Error('Corrupt xdr file');
					}
					let xdrBuffer: Buffer;
					[xdrBuffer, xdrBuffers] = getXDRBuffer(xdrBuffers, length);
					const transactionEntry =
						xdr.TransactionHistoryEntry.fromXDR(xdrBuffer);
					const transactionsToSort = transactionEntry
						.txSet()
						.txes()
						.map((envelope) => {
							const hash = createHash('sha256');
							hash.update(envelope.toXDR());
							const txeHash = hash.digest('base64');
							return {
								hash: txeHash,
								tx: envelope
							};
						});

					const sortedTransactions = transactionsToSort.sort((a, b) =>
						a.hash.localeCompare(b.hash)
					);

					const sortedBuffer = sortedTransactions.reduce(
						(previous, current) =>
							Buffer.concat([previous, current.tx.toXDR()]),
						transactionEntry.txSet().previousLedgerHash()
					);

					const hash = createHash('sha256');
					hash.update(sortedBuffer);
					map.set(transactionEntry.ledgerSeq(), hash.digest('base64'));
				} while (getMessageLengthFromXDRBuffer(xdrBuffers) > 0);
			}
			resolve(map);
		});
	});
}

//weird behaviour, di loads this worker file without referencing it
if (!isMainThread) {
	workerpool.worker({
		unzipAndHash: unzipAndHash,
		unzipAndHashTransactionResultEntries: unzipAndHashTransactionResultEntries,
		unzipAndHashTransactionEntries: unzipAndHashTransactionEntries,
		unzipLedgerHeaderHistoryEntries: unzipLedgerHeaderHistoryEntries
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
