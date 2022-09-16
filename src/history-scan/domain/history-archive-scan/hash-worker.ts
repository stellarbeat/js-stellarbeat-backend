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

export type LedgerHeaderHistoryEntryResult = {
	ledger: number;
	transactionsHash: string;
	transactionResultsHash: string;
	previousLedgerHeaderHash: string;
	ledgerHeaderHash: string;
};

export function processLedgerHeaderHistoryEntryXDR(
	ledgerHeaderHistoryEntryXDR: Buffer
): LedgerHeaderHistoryEntryResult {
	const ledgerHeaderHistoryEntry = xdr.LedgerHeaderHistoryEntry.fromXDR(
		ledgerHeaderHistoryEntryXDR
	);
	return {
		ledger: ledgerHeaderHistoryEntry.header().ledgerSeq(),
		transactionResultsHash: ledgerHeaderHistoryEntry
			.header()
			.txSetResultHash()
			.toString('base64'),
		transactionsHash: ledgerHeaderHistoryEntry
			.header()
			.scpValue()
			.txSetHash()
			.toString('base64'),
		previousLedgerHeaderHash: ledgerHeaderHistoryEntry
			.header()
			.previousLedgerHash()
			.toString('base64'),
		ledgerHeaderHash: ledgerHeaderHistoryEntry.hash().toString('base64')
	};
}

export function processTransactionHistoryResultEntryXDR(
	transactionHistoryResultXDR: Buffer
): { ledger: number; hash: string } {
	const transactionResult = xdr.TransactionHistoryResultEntry.fromXDR(
		transactionHistoryResultXDR
	);
	const hashSum = createHash('sha256');
	hashSum.update(transactionResult.txResultSet().toXDR());

	return {
		ledger: transactionResult.ledgerSeq(),
		hash: hashSum.digest('base64')
	};
}

export function processTransactionHistoryEntryXDR(
	transactionHistoryEntryXDR: Buffer
): { ledger: number; hash: string } {
	const transactionEntry = xdr.TransactionHistoryEntry.fromXDR(
		transactionHistoryEntryXDR
	);
	const transactionsToSort = transactionEntry
		.txSet()
		.txes()
		.map((envelope) => {
			const hash = createHash('sha256');
			hash.update(envelope.toXDR());
			const txeHash = hash.digest('hex');
			return {
				hash: txeHash,
				tx: envelope
			};
		});

	const sortedTransactions = transactionsToSort.sort((a, b) =>
		a.hash.localeCompare(b.hash)
	);

	const sortedBuffer = sortedTransactions.reduce(
		(previous, current) => Buffer.concat([previous, current.tx.toXDR()]),
		transactionEntry.txSet().previousLedgerHash()
	);

	const hash = createHash('sha256');
	hash.update(sortedBuffer);
	return { ledger: transactionEntry.ledgerSeq(), hash: hash.digest('base64') };
}

//weird behaviour, di loads this worker file without referencing it
if (!isMainThread) {
	workerpool.worker({
		unzipAndHash: unzipAndHash,
		processTransactionHistoryResultEntryXDR:
			processTransactionHistoryResultEntryXDR,
		processTransactionHistoryEntryXDR: processTransactionHistoryEntryXDR,
		processLedgerHeaderHistoryEntryXDR: processLedgerHeaderHistoryEntryXDR
	});
}
