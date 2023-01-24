import { NodeScannerHomeDomainStep } from '../NodeScannerHomeDomainStep';
import { HomeDomainFetcher } from '../HomeDomainFetcher';
import { Logger } from '../../../../../core/services/PinoLogger';
import { mock } from 'jest-mock-extended';
import { NodeScan } from '../NodeScan';

describe('NodeScannerHomeDomainStep', () => {
	const fetcher = mock<HomeDomainFetcher>();
	const homeDomainStep = new NodeScannerHomeDomainStep(fetcher, mock<Logger>());

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should update home domains', async function () {
		const nodeScan = mock<NodeScan>();
		const homeDomains = new Map<string, string>();
		fetcher.fetchHomeDomains.mockResolvedValue(homeDomains);
		await homeDomainStep.execute(nodeScan);
		expect(fetcher.fetchHomeDomains).toBeCalled();
		expect(nodeScan.updateHomeDomains).toBeCalledWith(homeDomains);
	});
});
