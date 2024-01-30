import { RegularTransactionSetHashPolicy } from '../RegularTransactionSetHashPolicy';

describe('RegularTransactionSetHashPolicy', () => {
	let policy: RegularTransactionSetHashPolicy;

	beforeEach(() => {
		policy = new RegularTransactionSetHashPolicy();
	});

	describe('calculateHash', () => {
		it('should return the correct hash for a given ledger header hash', () => {
			const previousLedgerHeaderHash = 'test-hash';
			const expectedHash = 'DMYdyBetnwEz/4ZNAfHD/0uRYNuCtoOo0CT5AJPlHIw='; // replace with the expected result

			const result = policy.calculateHash(previousLedgerHeaderHash);

			expect(result).toEqual(expectedHash);
		});
	});
});
