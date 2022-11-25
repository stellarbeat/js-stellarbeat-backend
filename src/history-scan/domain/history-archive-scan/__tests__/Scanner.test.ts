import { Scanner } from '../Scanner';
import { LoggerMock } from '../../../../shared/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import { ExceptionLoggerMock } from '../../../../shared/services/__mocks__/ExceptionLoggerMock';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { err, ok } from 'neverthrow';
import { RangeScanner } from '../RangeScanner';
import { ScanError, ScanErrorType } from '../ScanError';
import { ScanJob } from '../ScanJob';
import { ScanJobSettingsFactory } from '../ScanJobSettingsFactory';
import { CategoryScanner } from '../CategoryScanner';
import { ArchivePerformanceTester } from '../ArchivePerformanceTester';

it('should scan', async function () {
	const rangeScanner = mock<RangeScanner>();
	rangeScanner.scan.mockResolvedValue(
		ok({
			latestLedgerHeader: { ledger: 200, hash: 'ledger_hash' },
			scannedBucketHashes: new Set(['a'])
		})
	);

	const scanner = getScanner(rangeScanner);
	const scanJob = ScanJob.startNewScanChain(createDummyHistoryBaseUrl());
	const scan = await scanner.perform(new Date(), scanJob, 0, 200, 1);
	expect(scan.latestVerifiedLedgerHeaderHash).toEqual('ledger_hash');
	expect(scan.latestVerifiedLedger).toEqual(200);

	expect(rangeScanner.scan).toHaveBeenCalledTimes(2); //three chunks
	expect(rangeScanner.scan).toHaveBeenLastCalledWith(
		{ value: 'https://history0.stellar.org' },
		1,
		200,
		100,
		200,
		'ledger_hash',
		new Set(['a'])
	);
});

it('should not update latestVerifiedLedger in case of error', async () => {
	const rangeScanner = mock<RangeScanner>();
	rangeScanner.scan.mockResolvedValue(
		err(new ScanError(ScanErrorType.TYPE_VERIFICATION, 'url', 'message'))
	);
	const scanner = getScanner(rangeScanner);

	const scanJob = ScanJob.startNewScanChain(createDummyHistoryBaseUrl());
	const scan = await scanner.perform(new Date(), scanJob, 0, 200, 1);

	expect(scan.errorType).toEqual(ScanErrorType.TYPE_VERIFICATION);
	expect(scan.errorUrl).toEqual('url');
	expect(scan.latestVerifiedLedger).toEqual(0);
	expect(scan.latestVerifiedLedgerHeaderHash).toEqual(null);
});

function getScanner(rangeScanner: RangeScanner) {
	return new Scanner(
		rangeScanner,
		new ScanJobSettingsFactory(
			mock<CategoryScanner>(),
			mock<ArchivePerformanceTester>()
		),
		new LoggerMock(),
		new ExceptionLoggerMock(),
		100
	);
}
