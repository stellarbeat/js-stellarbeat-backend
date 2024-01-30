import { CategoryScanner } from '../../../CategoryScanner';
import { IHashCalculationPolicy } from './IHashCalculationPolicy';

export class FirstLedgerHashPolicy implements IHashCalculationPolicy {
	calculateHash() {
		return CategoryScanner.ZeroHash;
	}
}
