import { HistoryService } from '../history/HistoryService';
import { FullValidatorUpdater } from '../FullValidatorUpdater';
import { Node } from '@stellarbeat/js-stellar-domain';
import { HttpService } from '../../../shared/services/HttpService';
import { LoggerMock } from '../../../shared/services/__mocks__/LoggerMock';
import { HistoryArchiveScanService } from '../history/HistoryArchiveScanService';

it('should update full validator status of nodes', async function () {
	const historyService = new HistoryService(
		{} as HttpService,
		{} as HistoryArchiveScanService,
		new LoggerMock()
	);
	const fullValidatorDetector = new FullValidatorUpdater(historyService);

	const node = new Node('A');
	node.historyUrl = 'my-history-url';

	const otherNode = new Node('B');

	jest
		.spyOn(historyService, 'stellarHistoryIsUpToDate')
		.mockResolvedValue(true);
	await fullValidatorDetector.updateFullValidatorStatus([node, otherNode], '1');

	expect(node.isFullValidator).toBeTruthy();
	expect(otherNode.isFullValidator).toBeFalsy();
});
