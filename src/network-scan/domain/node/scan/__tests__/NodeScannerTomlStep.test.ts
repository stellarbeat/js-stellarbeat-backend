import { mock } from 'jest-mock-extended';
import { NodeScannerTomlStep } from '../NodeScannerTomlStep';
import { NodeScan } from '../NodeScan';
import { NodeTomlInfo } from '../NodeTomlInfo';
import { NodeTomlFetcher } from '../NodeTomlFetcher';

describe('NodeScannerTomlStep', () => {
	const nodeTomlFetcher = mock<NodeTomlFetcher>();
	const step = new NodeScannerTomlStep(nodeTomlFetcher);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should update with toml info', async function () {
		const nodeScan = mock<NodeScan>();
		const tomlInfo = new Set<NodeTomlInfo>();
		nodeTomlFetcher.fetchNodeTomlInfoCollection.mockResolvedValue(tomlInfo);
		await step.execute(nodeScan);
		expect(nodeTomlFetcher.fetchNodeTomlInfoCollection).toBeCalled();
		expect(nodeScan.updateWithTomlInfo).toBeCalledWith(tomlInfo);
	});
});
