import { Scanner } from '../Scanner';
import { LoggerMock } from '../../../../core/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import { ExceptionLoggerMock } from '../../../../core/services/__mocks__/ExceptionLoggerMock';
import { createDummyHistoryBaseUrl } from '../../history-archive/__fixtures__/HistoryBaseUrl';
import { err, ok } from 'neverthrow';
import { RangeScanner } from '../RangeScanner';
import { ScanError, ScanErrorType } from '../../scan/ScanError';
import { ScanJob } from '../../scan/ScanJob';
import { ScanSettingsFactory } from '../../scan/ScanSettingsFactory';
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
	const scanJob = ScanJob.newScanChain(createDummyHistoryBaseUrl(), 0, 200, 1);
	const scan = await scanner.perform(new Date(), scanJob);
	expect(scan.latestScannedLedgerHeaderHash).toEqual('ledger_hash');
	expect(scan.latestScannedLedger).toEqual(200);

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

it('should not update latestScannedLedger in case of error', async () => {
	const rangeScanner = mock<RangeScanner>();
	rangeScanner.scan.mockResolvedValue(
		err(new ScanError(ScanErrorType.TYPE_VERIFICATION, 'url', 'message'))
	);
	const scanner = getScanner(rangeScanner);

	const scanJob = ScanJob.newScanChain(createDummyHistoryBaseUrl(), 0, 200, 1);
	const scan = await scanner.perform(new Date(), scanJob);

	console.log(scan);
	expect(scan.error?.type).toEqual(ScanErrorType.TYPE_VERIFICATION);
	expect(scan.error?.url).toEqual('url');
	expect(scan.latestScannedLedger).toEqual(0);
	expect(scan.latestScannedLedgerHeaderHash).toEqual(null);
});

function getScanner(rangeScanner: RangeScanner) {
	return new Scanner(
		rangeScanner,
		new ScanSettingsFactory(
			mock<CategoryScanner>(),
			mock<ArchivePerformanceTester>()
		),
		new LoggerMock(),
		new ExceptionLoggerMock(),
		100
	);
}
