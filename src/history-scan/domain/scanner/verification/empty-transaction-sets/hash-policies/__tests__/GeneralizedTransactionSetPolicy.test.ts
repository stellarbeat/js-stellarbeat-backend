import { GeneralizedTransactionSetHashPolicy } from '../GeneralizedTransactionSetHashPolicy';
import { CategoryScanner } from '../../../../CategoryScanner';

describe('GeneralizedTransactionSetPolicy', () => {
	let policy: GeneralizedTransactionSetHashPolicy;

	beforeEach(() => {
		policy = new GeneralizedTransactionSetHashPolicy();
	});

	describe('calculateHash', () => {
		it('should return the correct hash for a given ledger header hash', () => {
			const previousLedgerHeaderHash = CategoryScanner.ZeroHash;
			const expectedHash = 'g78ujHf/l3cPVozRVmSx41OiXHOINBm8ijIvMcYCmCw='; // replace with the expected result

			const result = policy.calculateHash(previousLedgerHeaderHash);

			expect(result).toEqual(expectedHash);
		});
	});
});
