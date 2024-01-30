import { EmptyTransactionSetsHashVerifier } from '../EmptyTransactionSetsHashVerifier';
import { FirstLedgerHashPolicy } from '../hash-policies/FirstLedgerHashPolicy';
import { RegularTransactionSetHashPolicy } from '../hash-policies/RegularTransactionSetHashPolicy';
import { GeneralizedTransactionSetHashPolicy } from '../hash-policies/GeneralizedTransactionSetHashPolicy';
import Mock = jest.Mock;

jest.mock('../hash-policies/FirstLedgerHashPolicy');
jest.mock('../hash-policies/RegularTransactionSetHashPolicy');
jest.mock('../hash-policies/GeneralizedTransactionSetHashPolicy');

describe('EmptyTransactionSetsHashVerifier', () => {
	beforeEach(() => {
		// Clear all instances and calls to constructor and all methods:
		(FirstLedgerHashPolicy as Mock).mockClear();
		(RegularTransactionSetHashPolicy as Mock).mockClear();
		(GeneralizedTransactionSetHashPolicy as Mock).mockClear();
	});

	it('should use FirstLedgerHashPolicy for the first ledger', () => {
		EmptyTransactionSetsHashVerifier.verify(
			1,
			20,
			'test-hash',
			'expected-hash'
		);
		expect(FirstLedgerHashPolicy).toHaveBeenCalledTimes(1);
		expect(RegularTransactionSetHashPolicy).toHaveBeenCalledTimes(0);
		expect(GeneralizedTransactionSetHashPolicy).toHaveBeenCalledTimes(0);
	});

	it('should use RegularTransactionSetHashPolicy for protocol version less than 20', () => {
		EmptyTransactionSetsHashVerifier.verify(
			2,
			19,
			'test-hash',
			'expected-hash'
		);
		expect(FirstLedgerHashPolicy).toHaveBeenCalledTimes(0);
		expect(RegularTransactionSetHashPolicy).toHaveBeenCalledTimes(1);
		expect(GeneralizedTransactionSetHashPolicy).toHaveBeenCalledTimes(0);
	});

	it('should only use GeneralizedTransactionSetHashPolicy for protocol version 20 and beyond when verification succeeds', () => {
		// Mock the GeneralizedTransactionSetHashPolicy to return the expected hash
		(GeneralizedTransactionSetHashPolicy as jest.Mock).mockImplementation(
			() => {
				return {
					calculateHash: () => 'expected-hash'
				};
			}
		);

		EmptyTransactionSetsHashVerifier.verify(
			2,
			20,
			'test-hash',
			'expected-hash'
		);

		expect(FirstLedgerHashPolicy).toHaveBeenCalledTimes(0);
		expect(RegularTransactionSetHashPolicy).toHaveBeenCalledTimes(0);
		expect(GeneralizedTransactionSetHashPolicy).toHaveBeenCalledTimes(1);
	});

	it('should use RegularTransactionSetHashPolicy for protocol version 20 and beyond when verification fails', () => {
		// Mock the GeneralizedTransactionSetHashPolicy to return the wrong hash
		(GeneralizedTransactionSetHashPolicy as jest.Mock).mockImplementation(
			() => {
				return {
					calculateHash: () => 'wrong-hash'
				};
			}
		);

		EmptyTransactionSetsHashVerifier.verify(
			2,
			20,
			'test-hash',
			'expected-hash'
		);

		expect(FirstLedgerHashPolicy).toHaveBeenCalledTimes(0);
		expect(RegularTransactionSetHashPolicy).toHaveBeenCalledTimes(1);
		expect(GeneralizedTransactionSetHashPolicy).toHaveBeenCalledTimes(1);
	});
});
