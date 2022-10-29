import { Writable } from 'stream';
import { Category } from '../history-archive/Category';
import { LedgerHeaderHistoryEntryResult } from './hash-worker';
import { Url } from '../../../shared/domain/Url';
import { CategoryVerificationData, HasherPool } from './CategoryScanner';

export class CategoryXDRProcessor extends Writable {
	constructor(
		public pool: HasherPool,
		public url: Url,
		public category: Category,
		public categoryVerificationData: CategoryVerificationData
	) {
		super();
	}

	_write(
		xdr: Buffer,
		encoding: string,
		callback: (error?: Error | null) => void
	): void {
		if (this.pool.terminated) {
			//previous stream could still be transmitting
			callback(new Error('Workerpool terminated'));
			return;
		}
		switch (this.category) {
			case Category.results: {
				this.pool.workerpool
					.queue((hashWorker) =>
						hashWorker.processTransactionHistoryResultEntryXDR(xdr)
					)
					.then((hashMap) => {
						this.categoryVerificationData.calculatedTxSetResultHashes.set(
							hashMap.ledger,
							hashMap.hash
						);
					})
					.catch((error) => {
						console.log(this.url.value);
						console.log(error);
					});
				break;
			}
			case Category.transactions: {
				this.pool.workerpool
					.queue((hashWorker) =>
						hashWorker.processTransactionHistoryEntryXDR(xdr)
					)
					.then((hashMap) => {
						this.categoryVerificationData.calculatedTxSetHashes.set(
							hashMap.ledger,
							hashMap.hash
						);
					})
					.catch((error) => {
						console.log(this.url.value);
						console.log(error);
					});
				break;
			}
			case Category.ledger: {
				this.pool.workerpool
					.queue((hashWorker) =>
						hashWorker.processLedgerHeaderHistoryEntryXDR(xdr)
					)
					.then((ledgerHeaderResult) => {
						//processLedgerHeaderHistoryEntryXDR(singleXDRBuffer);

						this.categoryVerificationData.expectedHashesPerLedger.set(
							ledgerHeaderResult.ledger,
							{
								txSetResultHash: ledgerHeaderResult.transactionResultsHash,
								txSetHash: ledgerHeaderResult.transactionsHash,
								previousLedgerHeaderHash:
									ledgerHeaderResult.previousLedgerHeaderHash
							}
						);
						this.categoryVerificationData.ledgerHeaderHashes.set(
							ledgerHeaderResult.ledger,
							ledgerHeaderResult.ledgerHeaderHash
						);
					})
					.catch((error) => {
						console.log(this.url.value);
						console.log(error);
					});
				break;
			}
			default:
				break;
		}

		callback();
	}
}
