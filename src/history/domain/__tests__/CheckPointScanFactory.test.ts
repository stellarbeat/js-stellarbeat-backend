import { createDummyHistoryBaseUrl } from '../__fixtures__/HistoryBaseUrl';
import { CheckPointScanFactory } from '../CheckPointScanFactory';

it('should have ledger that is multiple of 64 minus 1', function () {
	const baseUrl = createDummyHistoryBaseUrl();
	expect(
		CheckPointScanFactory.createCheckPointScan(32, baseUrl).ledger
	).toEqual(63);
	expect(
		CheckPointScanFactory.createCheckPointScan(63, baseUrl).ledger
	).toEqual(63);
	expect(
		CheckPointScanFactory.createCheckPointScan(64, baseUrl).ledger
	).toEqual(127);
});

it('should generate next CheckPointScan with correct ledger', function () {
	const baseUrl = createDummyHistoryBaseUrl();

	const checkPointScan = CheckPointScanFactory.createCheckPointScan(
		32,
		baseUrl
	);

	expect(
		CheckPointScanFactory.createNextCheckPointScan(checkPointScan).ledger
	).toEqual(127);
});
