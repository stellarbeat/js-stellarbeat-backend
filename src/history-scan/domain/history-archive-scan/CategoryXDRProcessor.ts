import { Writable } from 'stream';
import { WorkerPool } from 'workerpool';
import { Category } from '../history-archive/Category';
import { LedgerHeaderHistoryEntryResult } from './hash-worker';
import { Url } from '../../../shared/domain/Url';
import { CategoryVerificationData } from './CategoryScanner';

export class CategoryXDRProcessor extends Writable {
	constructor(
		public pool: WorkerPool,
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
		switch (this.category) {
			case Category.results: {
				this.performInPool<{
					ledger: number;
					hash: string;
				}>(xdr, 'processTransactionHistoryResultEntryXDR')
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
				this.performInPool<{
					ledger: number;
					hash: string;
				}>(xdr, 'processTransactionHistoryEntryXDR')
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
				//processTransactionHistoryEntryXDR(singleXDRBuffer);
				break;
			}
			case Category.ledger: {
				this.performInPool<LedgerHeaderHistoryEntryResult>(
					xdr,
					'processLedgerHeaderHistoryEntryXDR'
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

	private async performInPool<Return>(
		data: Buffer,
		method:
			| 'processTransactionHistoryResultEntryXDR'
			| 'processTransactionHistoryEntryXDR'
			| 'processLedgerHeaderHistoryEntryXDR'
	): Promise<Return> {
		return new Promise((resolve, reject) => {
			this.pool
				.exec(method, [data])
				.then(function (map) {
					resolve(map);
				})
				.catch(function (err) {
					reject(err);
				});
		});
	}
}
