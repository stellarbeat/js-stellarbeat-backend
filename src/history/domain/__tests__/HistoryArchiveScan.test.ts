import { HistoryArchiveScan } from '../HistoryArchiveScan';
import { createDummyHistoryBaseUrl } from '../__fixtures__/HistoryBaseUrl';

it('should store max 10 checkPoint errors and Gaps', function () {
	const historyArchiveScan = HistoryArchiveScan.create(
		new Date(),
		createDummyHistoryBaseUrl(),
		0,
		1000
	);
	expect(historyArchiveScan.hasErrors).toBeFalsy();
	historyArchiveScan.addCheckPointErrors(new Array(20).fill(5));
	historyArchiveScan.addCheckPointErrors(new Array(20).fill(5));
	expect(historyArchiveScan.hasErrors).toBeTruthy();
	expect(historyArchiveScan.checkPointErrors).toHaveLength(10);

	expect(historyArchiveScan.hasGaps).toBeFalsy();
	historyArchiveScan.addCheckPointGaps(new Array(20).fill(5));
	historyArchiveScan.addCheckPointGaps(new Array(20).fill(5));
	expect(historyArchiveScan.hasGaps).toBeTruthy();
	expect(historyArchiveScan.checkPointGaps).toHaveLength(10);
});
