import { Writable } from 'stream';
import { Category } from '../history-archive/Category';
import { LedgerHeaderHistoryEntryResult } from './hash-worker';
import { Url } from '../../../core/domain/Url';
import { CategoryVerificationData } from './CategoryScanner';
import { HasherPool } from './HasherPool';

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
				break;
			}
			case Category.ledger: {
				this.performInPool<LedgerHeaderHistoryEntryResult>(
					xdr,
					'processLedgerHeaderHistoryEntryXDR'
				)
					.then((ledgerHeaderResult) => {
						this.categoryVerificationData.expectedHashesPerLedger.set(
							ledgerHeaderResult.ledger,
							{
								txSetResultHash: ledgerHeaderResult.transactionResultsHash,
								txSetHash: ledgerHeaderResult.transactionsHash,
								previousLedgerHeaderHash:
									ledgerHeaderResult.previousLedgerHeaderHash,
								bucketListHash: ledgerHeaderResult.bucketListHash
							}
						);
						this.categoryVerificationData.calculatedLedgerHeaderHashes.set(
							ledgerHeaderResult.ledger,
							ledgerHeaderResult.ledgerHeaderHash
						);

						this.categoryVerificationData.protocolVersions.set(
							ledgerHeaderResult.ledger,
							ledgerHeaderResult.protocolVersion
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
