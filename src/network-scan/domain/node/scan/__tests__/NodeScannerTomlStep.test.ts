import { mock } from 'jest-mock-extended';
import {
	TomlFetchError,
	TomlNodeInfo,
	TomlService
} from '../../../network/scan/TomlService';
import { Logger } from '../../../../../core/services/PinoLogger';
import { NodeScannerTomlStep } from '../NodeScannerTomlStep';
import { NodeScan } from '../NodeScan';

describe('NodeScannerTomlStep', () => {
	const tomlService = mock<TomlService>();
	const step = new NodeScannerTomlStep(tomlService, mock<Logger>());

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should update with toml info', async function () {
		const nodeScan = mock<NodeScan>();
		const tomlInfo = new Map<string, TomlNodeInfo>();
		tomlService.fetchNodeTomlInfoCollection.mockResolvedValue(tomlInfo);
		await step.execute(nodeScan);
		expect(tomlService.fetchNodeTomlInfoCollection).toBeCalled();
		expect(nodeScan.updateWithTomlInfo).toBeCalledWith(tomlInfo);
	});
});
