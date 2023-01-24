import Mock = jest.Mock;
import { ActiveIndex } from '../../index/active-index';
import { ValidatingIndex } from '../../index/validating-index';
import { AgeIndex } from '../../index/age-index';
import { TypeIndex } from '../../index/type-index';
import { TrustIndex } from '../../index/trust-index';
import { VersionIndex } from '../../index/version-index';
import { NodeIndex, IndexNode } from '../../node-index';
import { mock } from 'jest-mock-extended';
import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';

jest.mock('./../../index/active-index');
jest.mock('./../../index/validating-index');
jest.mock('./../../index/type-index');
jest.mock('./../../index/version-index');
jest.mock('./../../index/trust-index');
jest.mock('./../../index/age-index');

describe('NodeIndex', () => {
	test('calculateNodeIndex', () => {
		(ActiveIndex.get as Mock).mockImplementation(() => 1);
		(ValidatingIndex.get as Mock).mockImplementation(() => 0);

		(AgeIndex.get as Mock).mockImplementation(() => 1);

		(TypeIndex.get as Mock).mockImplementation(() => 0.101);
		(TrustIndex.get as Mock).mockImplementation(() => 0.5);
		(VersionIndex.get as Mock).mockImplementation(() => 1);

		const indexNode: IndexNode = {
			publicKey: 'publicKey',
			isActive30DaysPercentage: 100,
			hasUpToDateHistoryArchive: true,
			isValidating: true,
			stellarCoreVersion: 'stellarCoreVersion',
			dateDiscovered: new Date(),
			validating30DaysPercentage: 100
		};

		const trustGraph = mock<TrustGraph>();

		expect(
			NodeIndex.calculateIndexes([indexNode], trustGraph, 'v1.0.0')
		).toEqual(new Map([['publicKey', 60]]));
	});
});
