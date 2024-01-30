import { IHashCalculationPolicy } from './IHashCalculationPolicy';
import { createHash } from 'crypto';
import { xdr } from '@stellar/stellar-base';

export class GeneralizedTransactionSetHashPolicy
	implements IHashCalculationPolicy
{
	calculateHash(previousLedgerHeaderHash: string): string {
		// @ts-ignore
		const emptyPhase = new xdr.TransactionPhase(0, []);
		const transactionSetV1 = new xdr.TransactionSetV1({
			previousLedgerHash: Buffer.from(previousLedgerHeaderHash, 'base64'),
			phases: [emptyPhase, emptyPhase] //protocol 20 has two phases
		});

		const generalized = new xdr.GeneralizedTransactionSet(
			//@ts-ignore
			1,
			transactionSetV1
		);

		const hash = createHash('sha256');
		hash.update(generalized.toXDR());

		return hash.digest('base64');
	}
}
