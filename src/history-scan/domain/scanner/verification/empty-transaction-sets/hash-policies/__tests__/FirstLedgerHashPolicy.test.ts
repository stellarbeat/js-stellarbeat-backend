import { FirstLedgerHashPolicy } from '../FirstLedgerHashPolicy';

describe('FirstLedgerHashPolicy', () => {
	let policy: FirstLedgerHashPolicy;

	beforeEach(() => {
		policy = new FirstLedgerHashPolicy();
	});

	describe('calculateHash', () => {
		it('should return the correct hash for a given ledger header hash', () => {
			const expectedHash = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

			const result = policy.calculateHash();

			expect(result).toEqual(expectedHash);
		});
	});
});
