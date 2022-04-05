import { createDummyHistoryBaseUrl } from '../__fixtures__/HistoryBaseUrl';
import { CheckPointScanGenerator } from '../CheckPointScanGenerator';

it('should have ledger that is multiple of 64 minus 1', function () {
	const baseUrl = createDummyHistoryBaseUrl();
	expect(
		CheckPointScanGenerator.getCheckPointScanAt(32, baseUrl).ledger
	).toEqual(63);
	expect(
		CheckPointScanGenerator.getCheckPointScanAt(63, baseUrl).ledger
	).toEqual(63);
	expect(
		CheckPointScanGenerator.getCheckPointScanAt(64, baseUrl).ledger
	).toEqual(127);
});

it('should generate next checkpoint with correct ledger', function () {
	const baseUrl = createDummyHistoryBaseUrl();

	const checkPointScan = CheckPointScanGenerator.getCheckPointScanAt(
		32,
		baseUrl
	);

	expect(
		CheckPointScanGenerator.getNextCheckPointScan(checkPointScan).ledger
	).toEqual(127);
});
