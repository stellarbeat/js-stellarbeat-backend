import { NodeScannerHistoryArchiveStep } from '../NodeScannerHistoryArchiveStep';
import { mock } from 'jest-mock-extended';
import { NodeScan } from '../NodeScan';
import { NodeScannerArchivalStep } from '../NodeScannerArchivalStep';
import { InactiveNodesArchiver } from '../../archival/InactiveNodesArchiver';
import { ValidatorDemoter } from '../../archival/ValidatorDemoter';

describe('NodeScannerHistoryArchiveStep', () => {
	const inactiveNodesArchiver = mock<InactiveNodesArchiver>();
	const validatorDemoter = mock<ValidatorDemoter>();
	const nodeScannerArchivalStep = new NodeScannerArchivalStep(
		validatorDemoter,
		inactiveNodesArchiver
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should archive', async () => {
		const nodeScan = mock<NodeScan>();
		await nodeScannerArchivalStep.execute(nodeScan);
		expect(validatorDemoter.demote).toBeCalledTimes(1);
		expect(inactiveNodesArchiver.archive).toBeCalledTimes(1);
	});
});
