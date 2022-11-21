import { RestartAtLeastOneScan } from '../ScanScheduler';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { Scan } from '../Scan';

it('should start new scans for newly detected archives', function () {
	const scheduler = new RestartAtLeastOneScan();
	const archiveUrl1 = createDummyHistoryBaseUrl();
	const archiveUrl2 = createDummyHistoryBaseUrl();

	const scans = scheduler.schedule([archiveUrl1, archiveUrl2], []);
	expect(scans).toHaveLength(2);
	expect(scans.filter((scan) => scan.fromLedger === 0)).toHaveLength(2);
	expect(scans.filter((scan) => scan.isStartOfScanChain())).toHaveLength(2);
});

it('should restart at least one scan, the oldest one', function () {
	const scheduler = new RestartAtLeastOneScan();
	const archiveUrl1 = createDummyHistoryBaseUrl();
	const archiveUrl2 = createDummyHistoryBaseUrl();

	const previousScan1 = Scan.init(new Date('01-01-2001'), 0, archiveUrl1);
	const previousScan2 = Scan.init(new Date('01-01-2000'), 0, archiveUrl2);

	previousScan1.latestVerifiedLedger = 10;
	previousScan2.latestVerifiedLedger = 20;

	const scans = scheduler.schedule(
		[archiveUrl1, archiveUrl2],
		[previousScan1, previousScan2]
	);
	expect(scans).toHaveLength(2);
	const scan1 = scans
		.filter((scan) => scan.baseUrl.value === archiveUrl1.value)
		.pop() as Scan;
	expect(scan1.initializeDate.getTime()).toEqual(
		new Date('01-01-2001').getTime()
	);
	expect(scan1.isStartOfScanChain()).toBeFalsy();
	expect(scan1.fromLedger).toEqual(11);

	const scan2 = scans
		.filter((scan) => scan.baseUrl.value === archiveUrl2.value)
		.pop() as Scan;
	expect(scan2.isStartOfScanChain()).toBeTruthy();
	expect(scan2.latestVerifiedLedger).toEqual(0);
	expect(scan2.endDate).toEqual(null);
});
