import { mock } from 'jest-mock-extended';
import { ArchivePerformanceTester } from '../ArchivePerformanceTester';
import { CategoryScanner } from '../CategoryScanner';
import { ScanJobSettingsFactory } from '../ScanJobSettingsFactory';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { ScanJob } from '../ScanJob';
import { err, ok } from 'neverthrow';
import { ScanError, ScanErrorType } from '../ScanError';
import { Scan } from '../Scan';

it('should prioritize concurrency, fromLedger and toLedger parameters', async function () {
	const performanceTester = mock<ArchivePerformanceTester>();
	const categoryScanner = mock<CategoryScanner>();
	const settingsFactory = new ScanJobSettingsFactory(
		categoryScanner,
		performanceTester
	);

	const scanJob = ScanJob.startNewScanChain(createDummyHistoryBaseUrl());
	const settingsOrError = await settingsFactory.create(scanJob, 100, 200, 7);
	expect(settingsOrError.isOk()).toBeTruthy();
	if (settingsOrError.isErr()) throw settingsOrError.error;
	expect(settingsOrError.value.concurrency).toEqual(7);
	expect(settingsOrError.value.fromLedger).toEqual(100);
	expect(settingsOrError.value.toLedger).toEqual(200);
});

it('should return error if concurrency cannot be determined', async function () {
	const performanceTester = mock<ArchivePerformanceTester>();
	performanceTester.determineOptimalConcurrency.mockResolvedValue({
		concurrency: null,
		timeMsPerFile: null
	});
	const categoryScanner = mock<CategoryScanner>();
	categoryScanner.findLatestLedger.mockResolvedValue(ok(500));
	const settingsFactory = new ScanJobSettingsFactory(
		categoryScanner,
		performanceTester
	);
	const scanJob = ScanJob.startNewScanChain(createDummyHistoryBaseUrl());
	const settingsOrError = await settingsFactory.create(scanJob);

	expect(settingsOrError.isErr()).toBeTruthy();
	if (!settingsOrError.isErr()) throw new Error();
	expect(settingsOrError.error.toLedger).toEqual(500);
});

it('should return error if latest ledger cannot be determined', async function () {
	const performanceTester = mock<ArchivePerformanceTester>();
	performanceTester.determineOptimalConcurrency.mockResolvedValue({
		concurrency: 50,
		timeMsPerFile: 200
	});
	const categoryScanner = mock<CategoryScanner>();
	categoryScanner.findLatestLedger.mockResolvedValue(
		err(
			new ScanError(
				ScanErrorType.TYPE_CONNECTION,
				createDummyHistoryBaseUrl().value,
				'error'
			)
		)
	);
	const settingsFactory = new ScanJobSettingsFactory(
		categoryScanner,
		performanceTester
	);
	const scanJob = ScanJob.startNewScanChain(createDummyHistoryBaseUrl());
	const settingsOrError = await settingsFactory.create(scanJob);

	expect(settingsOrError.isErr()).toBeTruthy();
});

it('should determine optimal concurrency, signal slow archive and update toLedger accordingly', async function () {
	const performanceTester = mock<ArchivePerformanceTester>();
	performanceTester.determineOptimalConcurrency.mockResolvedValue({
		concurrency: 10,
		timeMsPerFile: 500
	});
	const categoryScanner = mock<CategoryScanner>();
	categoryScanner.findLatestLedger.mockResolvedValue(ok(500));
	const settingsFactory = new ScanJobSettingsFactory(
		categoryScanner,
		performanceTester
	);
	const scanJob = ScanJob.startNewScanChain(createDummyHistoryBaseUrl());
	const settingsWithZeroFromLedgerOrError = await settingsFactory.create(
		scanJob
	);

	expect(settingsWithZeroFromLedgerOrError.isOk()).toBeTruthy();
	if (settingsWithZeroFromLedgerOrError.isErr())
		throw settingsWithZeroFromLedgerOrError.error;
	expect(settingsWithZeroFromLedgerOrError.value.concurrency).toEqual(10);
	expect(settingsWithZeroFromLedgerOrError.value.isSlowArchive).toEqual(true);
	expect(settingsWithZeroFromLedgerOrError.value.fromLedger).toEqual(0);

	categoryScanner.findLatestLedger.mockResolvedValue(ok(10000000));
	const settingsOrError = await settingsFactory.create(scanJob);

	expect(settingsOrError.isOk()).toBeTruthy();
	if (settingsOrError.isErr()) throw settingsOrError.error;
	expect(settingsOrError.value.concurrency).toEqual(10);
	expect(settingsOrError.value.isSlowArchive).toEqual(true);
	expect(settingsOrError.value.fromLedger > 0).toBeTruthy();
});

it('should continue a scan from the previous latest scanned ledger', async function () {
	const performanceTester = mock<ArchivePerformanceTester>();
	const categoryScanner = mock<CategoryScanner>();
	const settingsFactory = new ScanJobSettingsFactory(
		categoryScanner,
		performanceTester
	);

	const previousScan = new Scan(
		new Date(),
		new Date(),
		new Date(),
		createDummyHistoryBaseUrl(),
		0,
		63,
		63,
		'hash'
	);
	const scanJob = ScanJob.continueScanChain(previousScan);
	const settingsOrError = await settingsFactory.create(
		scanJob,
		undefined,
		127,
		10
	);

	expect(settingsOrError.isOk()).toBeTruthy();
	if (settingsOrError.isErr()) throw settingsOrError.error;
	expect(settingsOrError.value.fromLedger).toEqual(64);
});
