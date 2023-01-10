import { HistoryService } from '../../history/HistoryService';
import { FullValidatorUpdater } from '../FullValidatorUpdater';
import { Node } from '@stellarbeat/js-stellar-domain';
import { mock } from 'jest-mock-extended';

it('should update full validator status of validator nodes', async function () {
	const historyService = mock<HistoryService>();
	const fullValidatorDetector = new FullValidatorUpdater(historyService);

	const node = new Node('A');
	node.historyUrl = 'my-history-url';
	node.isValidating = true;

	const otherNode = new Node('B');

	historyService.stellarHistoryIsUpToDate.mockResolvedValue(true);
	await fullValidatorDetector.updateFullValidatorStatus([node, otherNode], '1');

	expect(node.isFullValidator).toBeTruthy();
	expect(otherNode.isFullValidator).toBeFalsy();
});
