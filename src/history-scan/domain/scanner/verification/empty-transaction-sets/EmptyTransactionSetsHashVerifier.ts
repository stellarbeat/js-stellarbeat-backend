import { err, ok, Result } from 'neverthrow';
import { IHashCalculationPolicy } from './hash-policies/IHashCalculationPolicy';
import { FirstLedgerHashPolicy } from './hash-policies/FirstLedgerHashPolicy';
import { RegularTransactionSetHashPolicy } from './hash-policies/RegularTransactionSetHashPolicy';
import { GeneralizedTransactionSetHashPolicy } from './hash-policies/GeneralizedTransactionSetHashPolicy';
import { mapUnknownToError } from '../../../../../core/utilities/mapUnknownToError';

export class EmptyTransactionSetsHashVerifier {
	static verify(
		ledger: number,
		protocolVersion: number,
		previousLedgerHeaderHash: string,
		expectedHash: string
	): Result<boolean, Error> {
		try {
			let hashCalculationPolicy: IHashCalculationPolicy;
			if (ledger === 1) {
				hashCalculationPolicy = new FirstLedgerHashPolicy();
			} else if (protocolVersion < 20) {
				hashCalculationPolicy = new RegularTransactionSetHashPolicy();
			} else {
				hashCalculationPolicy = new GeneralizedTransactionSetHashPolicy();
			}

			const calculatedTxSetHash = hashCalculationPolicy.calculateHash(
				previousLedgerHeaderHash
			);

			const match = calculatedTxSetHash === expectedHash;

			if (!match && protocolVersion === 20 && ledger !== 1) {
				//the first protocol 20 ledger is hashed as a regular transaction set, this is a known caveat
				const regularTxSetHash =
					new RegularTransactionSetHashPolicy().calculateHash(
						previousLedgerHeaderHash
					);
				return ok(regularTxSetHash === expectedHash);
			}

			return ok(match);
		} catch (error: unknown) {
			return err(
				new Error(`Failed to verify hash: ${mapUnknownToError(error).message}`)
			);
		}
	}
}
