import { IHashCalculationPolicy } from './IHashCalculationPolicy';
import { createHash } from 'crypto';

export class RegularTransactionSetHashPolicy implements IHashCalculationPolicy {
	calculateHash(previousLedgerHeaderHash: string): string {
		const previousLedgerHashHashed = createHash('sha256');
		previousLedgerHashHashed.update(
			Buffer.from(previousLedgerHeaderHash, 'base64')
		);
		return previousLedgerHashHashed.digest('base64');
	}
}
