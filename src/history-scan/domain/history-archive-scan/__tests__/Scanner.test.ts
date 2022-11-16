import { Scanner } from '../Scanner';
import { CheckPointGenerator } from '../../check-point/CheckPointGenerator';
import { StandardCheckPointFrequency } from '../../check-point/StandardCheckPointFrequency';
import { LoggerMock } from '../../../../shared/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import { ExceptionLoggerMock } from '../../../../shared/services/__mocks__/ExceptionLoggerMock';
import { Scan } from '../Scan';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { err, ok } from 'neverthrow';
import { RangeScanner } from '../RangeScanner';
import { ScanError, ScanErrorType } from '../ScanError';

it('should scan', async function () {
	const rangeScanner = mock<RangeScanner>();
	rangeScanner.scan.mockResolvedValue(
		ok({
			latestLedgerHeader: { ledger: 200, hash: 'ledger_hash' },
			scannedBucketHashes: new Set(['a'])
		})
	);

	const scanner = getScanner(rangeScanner);

	const scan = await scanner.scan(0, 200, createDummyHistoryBaseUrl(), 1, 100);
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
		err(new ScanError(ScanErrorType.TYPE_VERIFICATION, 'url'))
	);
	const scanner = getScanner(rangeScanner);

	const scan = await scanner.scan(0, 300, createDummyHistoryBaseUrl(), 1, 100);

	expect(scan.errorType).toEqual(ScanErrorType.TYPE_VERIFICATION);
	expect(scan.errorUrl).toEqual('url');
	expect(scan.latestVerifiedLedger).toEqual(0);
	expect(scan.latestVerifiedLedgerHeaderHash).toEqual(undefined);

	const previousScan = new Scan(
		new Date(),
		0,
		100,
		createDummyHistoryBaseUrl(),
		1,
		100
	);

	previousScan.latestVerifiedLedger = 100;
	previousScan.latestVerifiedLedgerHeaderHash = 'previous_hash';

	const continuedScan = await scanner.continueScan(previousScan, 200, 1, 100);
	expect(continuedScan.latestVerifiedLedgerHeaderHash).toEqual('previous_hash');
	expect(continuedScan.latestVerifiedLedger).toEqual(100);
});

it('should pickup from previous scan', async function () {
	const rangeScanner = mock<RangeScanner>();
	rangeScanner.scan.mockResolvedValue(
		ok({
			latestLedgerHeader: { ledger: 200, hash: 'new_hash' },
			scannedBucketHashes: new Set(['a'])
		})
	);
	const scanner = getScanner(rangeScanner);

	const previousScan = new Scan(
		new Date(),
		0,
		100,
		createDummyHistoryBaseUrl(),
		1,
		100
	); //should result in two chunks
	previousScan.latestVerifiedLedger = 100;
	previousScan.latestVerifiedLedgerHeaderHash = 'previous_hash';

	const scan = await scanner.continueScan(previousScan, 200, 1, 100);
	expect(scan.latestVerifiedLedgerHeaderHash).toEqual('new_hash');
	expect(scan.latestVerifiedLedger).toEqual(200);
	expect(rangeScanner.scan).toHaveBeenCalledTimes(1); //three chunks
	expect(rangeScanner.scan).toHaveBeenLastCalledWith(
		{ value: 'https://history0.stellar.org' },
		1,
		200,
		101,
		100,
		'previous_hash',
		new Set([])
	);
});

function getScanner(rangeScanner: RangeScanner) {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);

	return new Scanner(
		checkPointGenerator,
		rangeScanner,
		new LoggerMock(),
		new ExceptionLoggerMock()
	);
}
