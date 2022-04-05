import { HistoryArchiveScanSummary } from '../HistoryArchiveScanSummary';
import { createDummyHistoryBaseUrl } from '../__fixtures__/HistoryBaseUrl';
import { CheckPointScan, ScanStatus } from '../CheckPointScan';
import { CheckPointScanFactory } from '../CheckPointScanFactory';

it('should process checkPointScans', function () {
	const scan = CheckPointScanFactory.createCheckPointScan(
		1,
		createDummyHistoryBaseUrl()
	);
	scan.resultsCategoryScanStatus = ScanStatus.missing;
	scan.historyCategoryScanStatus = ScanStatus.error;

	const otherScan = CheckPointScanFactory.createNextCheckPointScan(scan);

	const checkPointScans: CheckPointScan[] = Array(11).fill(scan);
	checkPointScans.push(otherScan);

	const historyArchiveScanSummary = HistoryArchiveScanSummary.create(
		new Date(),
		new Date(),
		createDummyHistoryBaseUrl(),
		0,
		1000,
		checkPointScans
	);

	expect(historyArchiveScanSummary.hasErrors).toBeTruthy();
	expect(historyArchiveScanSummary.checkPointErrors).toHaveLength(10);

	expect(historyArchiveScanSummary.hasGaps).toBeTruthy();
	expect(historyArchiveScanSummary.checkPointGaps).toHaveLength(10);
});
