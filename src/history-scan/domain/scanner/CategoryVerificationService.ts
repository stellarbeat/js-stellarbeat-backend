import {
	CategoryScanner,
	CategoryVerificationData,
	ExpectedHashes
} from './CategoryScanner';
import { createHash } from 'crypto';
import { Category } from '../history-archive/Category';
import { err, ok, Result } from 'neverthrow';
import { CheckPointFrequency } from '../check-point/CheckPointFrequency';
import { injectable } from 'inversify';
import { LedgerHeader } from './Scanner';
import { getLowestNumber } from '../../../core/utilities/getLowestNumber';
import { xdr } from '@stellar/stellar-base';
import { EmptyTransactionSetsHashVerifier } from './verification/empty-transaction-sets/EmptyTransactionSetsHashVerifier';

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
			categoryVerificationData
		);

		for (const [
			ledger,
			expectedHashes
		] of categoryVerificationData.expectedHashesPerLedger) {
			const result = this.verifyLedgerData(
				ledger,
				lowestLedger,
				categoryVerificationData,
				expectedHashes,
				bucketListHashes,
				checkPointFrequency,
				initialPreviousLedgerHeader
			);
			if (result.isErr()) return result;
		}

		return ok(undefined);
	}
	private verifyLedgerData(
		ledger: number,
		lowestLedger: number,
		categoryVerificationData: CategoryVerificationData,
		expectedHashes: ExpectedHashes,
		bucketListHashes: Map<number, string>,
		checkPointFrequency: CheckPointFrequency,
		initialPreviousLedgerHeader?: LedgerHeader
	) {
		if (
			!this.verifyTransactions(ledger, categoryVerificationData, expectedHashes)
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

		return ok(undefined);
	}

	private static getLowestLedger(
		categoryVerificationData: CategoryVerificationData
	) {
		return getLowestNumber(
			Array.from(categoryVerificationData.expectedHashesPerLedger.keys())
		);
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
		const calculatedTxSetHash =
			categoryVerificationData.calculatedTxSetHashes.get(ledger);
		const protocolVersion =
			categoryVerificationData.protocolVersions.get(ledger) ?? 0;

		if (!calculatedTxSetHash) {
			const matched = EmptyTransactionSetsHashVerifier.verify(
				ledger,
				protocolVersion,
				expectedHashes.previousLedgerHeaderHash,
				expectedHashes.txSetHash
			);
			if (matched.isErr()) return false;
			else return matched.value;
		}

		return calculatedTxSetHash === expectedHashes.txSetHash;
	}
}
