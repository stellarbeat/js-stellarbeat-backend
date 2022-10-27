import * as workerpool from 'workerpool';
import { gunzip } from 'zlib';
import { createHash } from 'crypto';
import { isMainThread } from 'worker_threads';
import { xdr } from 'stellar-base';
import * as hasher from '@stellarbeat/stellar-history-archive-hasher';

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
	const hash = hasher.hash_transaction_history_result_entry(
		transactionHistoryResultXDR
	);
	return {
		ledger: Buffer.from(transactionHistoryResultXDR).readInt32BE(),
		hash: Buffer.from(hash).toString('base64')
	};
}

export function processTransactionHistoryEntryXDR(
	transactionHistoryEntryXDR: Buffer
): { ledger: number; hash: string } {
	const transactionEntry = xdr.TransactionHistoryEntry.fromXDR(
		transactionHistoryEntryXDR
	);
	const transactionsToSort: { hash: string; tx: Buffer }[] = [];
	for (const envelope of transactionEntry.txSet().txes()) {
		const hash = createHash('sha256');
		const xdrEnvelope = envelope.toXDR();
		hash.update(xdrEnvelope);
		const txeHash = hash.digest('hex');
		transactionsToSort.push({
			hash: txeHash,
			tx: xdrEnvelope
		});
	}

	const hash = createHash('sha256');
	hash.update(transactionEntry.txSet().previousLedgerHash());

	const sortedTransactions = transactionsToSort.sort((a, b) =>
		a.hash.localeCompare(b.hash)
	);
	for (const sortedTransaction of sortedTransactions) {
		hash.update(sortedTransaction.tx);
	}

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
