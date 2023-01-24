import { NodeScannerHistoryArchiveStep } from '../NodeScannerHistoryArchiveStep';
import { HistoryArchiveService } from '../../../../../history-scan/domain/history-archive/HistoryArchiveService';
import { mock } from 'jest-mock-extended';
import { Logger } from '../../../../../core/services/PinoLogger';
import { HistoryArchiveStatusFinder } from '../HistoryArchiveStatusFinder';
import { NodeScan } from '../NodeScan';

describe('NodeScannerHistoryArchiveStep', () => {
	const historyArchiveStatusFinder = mock<HistoryArchiveStatusFinder>();
	const historyArchiveStep = new NodeScannerHistoryArchiveStep(
		historyArchiveStatusFinder
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should update full validator status', async () => {
		const nodeScan = mock<NodeScan>();
		const upToDateArchives = new Set(['a']);
		historyArchiveStatusFinder.getNodesWithUpToDateHistoryArchives.mockResolvedValue(
			upToDateArchives
		);
		const verificationErrors = new Set(['b']);
		historyArchiveStatusFinder.getNodesWithHistoryArchiveVerificationErrors.mockResolvedValue(
			verificationErrors
		);
		await historyArchiveStep.execute(nodeScan);
		expect(
			historyArchiveStatusFinder.getNodesWithUpToDateHistoryArchives
		).toBeCalled();
		expect(
			historyArchiveStatusFinder.getNodesWithHistoryArchiveVerificationErrors
		).toBeCalled();
		expect(nodeScan.updateHistoryArchiveUpToDateStatus).toBeCalledWith(
			upToDateArchives
		);
		expect(nodeScan.updateHistoryArchiveVerificationStatus).toBeCalledWith(
			verificationErrors
		);
	});
});
