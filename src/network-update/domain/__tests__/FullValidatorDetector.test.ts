import { HistoryService } from '../HistoryService';
import { FullValidatorDetector } from '../FullValidatorDetector';
import { Node } from '@stellarbeat/js-stellar-domain';
import { HttpService } from '../../../shared/services/HttpService';
import { LoggerMock } from '../../../shared/services/__mocks__/LoggerMock';

it('should update full validator status of nodes', async function () {
	const historyService = new HistoryService(
		{} as HttpService,
		new LoggerMock()
	);
	const fullValidatorDetector = new FullValidatorDetector(historyService);

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
