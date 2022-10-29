import { Writable } from 'stream';
import { Category } from '../history-archive/Category';
import { LedgerHeaderHistoryEntryResult } from './hash-worker';
import { Url } from '../../../shared/domain/Url';
import { CategoryVerificationData, HasherPool } from './CategoryScanner';

export class CategoryXDRProcessor extends Writable {
	constructor(
		public pool: HasherPool,
		public categoryVerificationData: CategoryVerificationData
	) {
		super();
	}

	process(xdr: Buffer, url: Url, category: Category): void {
		if (this.pool.terminated) {
			return;
		}
		switch (category) {
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
						console.log(url.value);
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
						console.log(url.value);
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
						console.log(url.value);
						console.log(error);
					});
				break;
			}
			default:
				break;
		}
	}

	private async performInPool<Return>(
		data: Buffer,
		method:
			| 'processTransactionHistoryResultEntryXDR'
			| 'processTransactionHistoryEntryXDR'
			| 'processLedgerHeaderHistoryEntryXDR'
	): Promise<Return> {
		return new Promise((resolve, reject) => {
			this.pool.workerpool
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
