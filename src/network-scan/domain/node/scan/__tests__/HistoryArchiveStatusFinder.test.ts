import { HistoryService } from '../history/HistoryService';
import { HistoryArchiveStatusFinder } from '../HistoryArchiveStatusFinder';
import { mock } from 'jest-mock-extended';

it('return the nodes with up-to-date history archives', async function () {
	const historyService = mock<HistoryService>();
	const historyArchiveStatusFinder = new HistoryArchiveStatusFinder(
		historyService
	);

	const map = new Map([
		['GAA', 'https://history.stellar.org/prd/core-live/core_live_001'],
		['GAB', 'https://history.stellar.org/prd/core-live/core_live_002']
	]);

	historyService.stellarHistoryIsUpToDate.mockResolvedValueOnce(true);

	const publicKeys =
		await historyArchiveStatusFinder.getNodesWithUpToDateHistoryArchives(
			map,
			'1'
		);

	expect(publicKeys.size).toEqual(1);
	expect(publicKeys.has('GAA')).toBeTruthy();
});
