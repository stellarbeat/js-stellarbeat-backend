import { RestartAtLeastOneScan } from '../ScanScheduler';
import { createDummyHistoryBaseUrl } from '../../history-archive/__fixtures__/HistoryBaseUrl';
import { Scan } from '../../scan/Scan';
import { ScanJob } from '../../scan/ScanJob';

it('should start new scans for newly detected archives', function () {
	const scheduler = new RestartAtLeastOneScan();
	const archiveUrl1 = createDummyHistoryBaseUrl();
	const archiveUrl2 = createDummyHistoryBaseUrl();

	const scanJobs = scheduler.schedule([archiveUrl1, archiveUrl2], []);
	expect(scanJobs).toHaveLength(2);
	expect(scanJobs.filter((scan) => scan.isNewScanChainJob())).toHaveLength(2);
});

it('should restart at least one scan, the oldest chain', async function () {
	const scheduler = new RestartAtLeastOneScan();
	const archiveUrl = createDummyHistoryBaseUrl();
	const olderArchiveUrl = createDummyHistoryBaseUrl();

	const previousScan = new Scan(
		new Date('01-01-2001'),
		new Date('01-01-2001'), //older scan update
		new Date('01-01-2001'),
		archiveUrl,
		50,
		100,
		49,
		'hash'
	);
	const olderPreviousScan = new Scan(
		new Date('01-01-2000'), //oldest init date
		new Date('01-01-2002'),
		new Date('01-01-2002'),
		olderArchiveUrl,
		50,
		100,
		49,
		'hash'
	);

	const scanJobs = scheduler.schedule(
		[archiveUrl, olderArchiveUrl],
		[previousScan, olderPreviousScan]
	);
	expect(scanJobs).toHaveLength(2);
	const continueJob = scanJobs
		.filter((job) => job.url.value === archiveUrl.value)
		.pop() as ScanJob;
	expect(continueJob.chainInitDate?.getTime()).toEqual(
		previousScan.scanChainInitDate.getTime()
	);
	expect(continueJob.isNewScanChainJob()).toBeFalsy();
	expect(continueJob.latestScannedLedger).toEqual(
		previousScan.latestScannedLedger
	);
	expect(continueJob.latestScannedLedgerHeaderHash).toEqual(
		previousScan.latestScannedLedgerHeaderHash
	);

	const newChainJob = scanJobs
		.filter((scan) => scan.url.value === olderArchiveUrl.value)
		.pop() as ScanJob;
	expect(newChainJob.isNewScanChainJob()).toBeTruthy();
	expect(newChainJob.latestScannedLedger).toEqual(0);
	expect(newChainJob.latestScannedLedgerHeaderHash).toBeNull();
});
