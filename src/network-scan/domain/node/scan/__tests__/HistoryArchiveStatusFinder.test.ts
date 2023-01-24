import { HistoryService } from '../history/HistoryService';
import { HistoryArchiveStatusFinder } from '../HistoryArchiveStatusFinder';
import { mock } from 'jest-mock-extended';
import { ok } from 'neverthrow';

describe('HistoryArchiveStatusFinder', () => {
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
				BigInt(1)
			);

		expect(publicKeys.size).toEqual(1);
		expect(publicKeys.has('GAA')).toBeTruthy();
	});

	it('should fetch nodes with history archive verification errors', async function () {
		const historyService = mock<HistoryService>();
		const historyArchiveStatusFinder = new HistoryArchiveStatusFinder(
			historyService
		);

		const map = new Map([
			['GAA', 'https://history.stellar.org/prd/core-live/core_live_001'],
			['GAB', 'https://history.stellar.org/prd/core-live/core_live_002']
		]);

		historyService.getHistoryUrlsWithScanErrors.mockResolvedValueOnce(
			ok(new Set(['https://history.stellar.org/prd/core-live/core_live_001']))
		);

		const publicKeys =
			await historyArchiveStatusFinder.getNodesWithHistoryArchiveVerificationErrors(
				map
			);

		expect(publicKeys.size).toEqual(1);
		expect(publicKeys.has('GAA')).toBeTruthy();
	});
});
