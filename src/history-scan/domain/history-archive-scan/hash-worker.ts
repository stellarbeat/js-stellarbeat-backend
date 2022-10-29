import { xdr } from 'stellar-base';
import * as hasher from '@stellarbeat/stellar-history-archive-hasher';
import { expose, isWorkerRuntime } from 'threads/worker';

export type LedgerHeaderHistoryEntryResult = {
	ledger: number;
	transactionsHash: string;
	transactionResultsHash: string;
	previousLedgerHeaderHash: string;
	ledgerHeaderHash: string;
};

const hashWorker = {
	processLedgerHeaderHistoryEntryXDR(
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
	},

	processTransactionHistoryResultEntryXDR(
		transactionHistoryResultXDR: Buffer
	): { ledger: number; hash: string } {
		const hash = hasher.hash_transaction_history_result_entry(
			transactionHistoryResultXDR
		);
		return {
			ledger: Buffer.from(transactionHistoryResultXDR).readInt32BE(),
			hash: Buffer.from(hash).toString('base64')
		};
	},

	processTransactionHistoryEntryXDR(transactionHistoryEntryXDR: Uint8Array): {
		ledger: number;
		hash: string;
	} {
		const hash = hasher.hash_transaction_history_entry(
			transactionHistoryEntryXDR
		);
		return {
			ledger: Buffer.from(transactionHistoryEntryXDR).readInt32BE(),
			hash: Buffer.from(hash).toString('base64')
		};
	}
};

export type HashWorker = typeof hashWorker;

if (isWorkerRuntime()) expose(hashWorker);
