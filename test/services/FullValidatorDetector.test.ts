import { HistoryService } from '../../src/services/HistoryService';
import { FullValidatorDetector } from '../../src/services/FullValidatorDetector';
import { Node } from '@stellarbeat/js-stellar-domain';
import { HttpService } from '../../src/services/HttpService';
import { LoggerMock } from '../LoggerMock';

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
