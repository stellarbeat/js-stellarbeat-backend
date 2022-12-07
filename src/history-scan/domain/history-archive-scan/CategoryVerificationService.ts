import {
	CategoryScanner,
	CategoryVerificationData,
	ExpectedHashes,
	ExpectedHashesPerLedger
} from './CategoryScanner';
import { createHash } from 'crypto';
import { Category } from '../history-archive/Category';
import { err, ok, Result } from 'neverthrow';
import { CheckPointFrequency } from '../check-point/CheckPointFrequency';
import { injectable } from 'inversify';
import { LedgerHeader } from './Scanner';

interface VerificationError {
	ledger: number;
	category: Category;
	message: string;
}

@injectable()
export class CategoryVerificationService {
	verify(
		categoryVerificationData: CategoryVerificationData,
		bucketListHashes: Map<number, string>,
		checkPointFrequency: CheckPointFrequency,
		initialPreviousLedgerHeader?: LedgerHeader //bootstrapped from a previous run
	): Result<void, VerificationError> {
		const lowestLedger = CategoryVerificationService.getLowestLedger(
			categoryVerificationData.expectedHashesPerLedger
		);

		for (const [
			ledger,
			expectedHashes
		] of categoryVerificationData.expectedHashesPerLedger) {
			if (
				!this.verifyTransactions(
					ledger,
					categoryVerificationData,
					expectedHashes
				)
			) {
				return err({
					ledger: ledger,
					category: Category.transactions,
					message: 'Wrong transaction hash'
				});
			}

			if (
				!this.verifyTransactionResults(
					ledger,
					categoryVerificationData,
					expectedHashes
				)
			) {
				return err({
					ledger: ledger,
					category: Category.results,
					message: 'Wrong results hash'
				});
			}

			if (
				!this.verifyLedgerHeaders(
					ledger,
					categoryVerificationData,
					expectedHashes,
					lowestLedger,
					initialPreviousLedgerHeader
				)
			)
				return err({
					ledger: ledger,
					category: Category.ledger,
					message: 'Wrong ledger hash'
				});

			if (
				!this.verifyBucketListHash(
					ledger,
					checkPointFrequency,
					expectedHashes,
					bucketListHashes
				)
			) {
				if (expectedHashes.bucketListHash !== bucketListHashes.get(ledger)) {
					return err({
						ledger: ledger,
						category: Category.ledger,
						message: 'Wrong bucket list hash'
					});
				}
			}
		}

		return ok(undefined);
	}

	verifyTransactionResults(
		ledger: number,
		categoryVerificationData: CategoryVerificationData,
		expectedHashes: ExpectedHashes
	): boolean {
		let calculatedTxSetResultHash =
			categoryVerificationData.calculatedTxSetResultHashes.get(ledger);
		if (!calculatedTxSetResultHash) {
			if (ledger > 1) calculatedTxSetResultHash = CategoryScanner.ZeroXdrHash;
			else calculatedTxSetResultHash = CategoryScanner.ZeroHash;
		}

		return expectedHashes.txSetResultHash === calculatedTxSetResultHash;
	}

	verifyBucketListHash(
		ledger: number,
		checkPointFrequency: CheckPointFrequency,
		expectedHashes: ExpectedHashes,
		bucketListHashes: Map<number, string>
	): boolean {
		if ((ledger + 1) % checkPointFrequency.get() === 0) {
			return expectedHashes.bucketListHash === bucketListHashes.get(ledger);
		}
		return true;
	}

	verifyLedgerHeaders(
		ledger: number,
		categoryVerificationData: CategoryVerificationData,
		expectedHashes: ExpectedHashes,
		lowestLedger: number,
		initialPreviousLedgerHeader?: LedgerHeader
	): boolean {
		const calculatedPreviousLedgerHash =
			categoryVerificationData.calculatedLedgerHeaderHashes.get(ledger - 1);

		if (
			expectedHashes.previousLedgerHeaderHash === calculatedPreviousLedgerHash
		) {
			return true;
		}

		if (
			initialPreviousLedgerHeader &&
			ledger - 1 === initialPreviousLedgerHeader.ledger &&
			initialPreviousLedgerHeader.hash ===
				expectedHashes.previousLedgerHeaderHash
		) {
			return true;
		}

		if (ledger === lowestLedger && !initialPreviousLedgerHeader) {
			return true;
		}

		return false;
	}

	verifyTransactions(
		ledger: number,
		categoryVerificationData: CategoryVerificationData,
		expectedHashes: ExpectedHashes
	): boolean {
		let calculatedTxSetHash =
			categoryVerificationData.calculatedTxSetHashes.get(ledger);
		if (!calculatedTxSetHash) {
			//if there are no transactions for the ledger, the hash is equal to the previous ledger header hash
			if (ledger > 1) {
				const previousLedgerHashHashed = createHash('sha256');
				previousLedgerHashHashed.update(
					Buffer.from(expectedHashes.previousLedgerHeaderHash, 'base64')
				);
				calculatedTxSetHash = previousLedgerHashHashed.digest('base64');
			} else calculatedTxSetHash = CategoryScanner.ZeroHash;
		}

		return calculatedTxSetHash === expectedHashes.txSetHash;
	}

	static getLowestLedger(expectedHashesPerLedger: ExpectedHashesPerLedger) {
		let lowestLedger = Number.MAX_SAFE_INTEGER;
		for (const ledger of expectedHashesPerLedger.keys()) {
			if (ledger < lowestLedger) lowestLedger = ledger;
		}
		return lowestLedger;
	}
}
