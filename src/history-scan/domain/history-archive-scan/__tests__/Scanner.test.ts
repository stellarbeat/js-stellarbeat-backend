import { LedgerHeader, Scanner } from '../Scanner';
import { CheckPointGenerator } from '../../check-point/CheckPointGenerator';
import { StandardCheckPointFrequency } from '../../check-point/StandardCheckPointFrequency';
import { LoggerMock } from '../../../../shared/services/__mocks__/LoggerMock';
import { HttpQueue } from '../../HttpQueue';
import { mock } from 'jest-mock-extended';
import { ExceptionLoggerMock } from '../../../../shared/services/__mocks__/ExceptionLoggerMock';
import { Scan } from '../Scan';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { ok } from 'neverthrow';
import { RangeScanner } from '../RangeScanner';

it('should scan', async function () {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);

	const rangeScanner = mock<RangeScanner>();
	rangeScanner.scan.mockResolvedValue(
		ok({
			latestLedgerHeader: { ledger: 200, hash: 'ledger_hash' },
			scannedBucketHashes: new Set(['a'])
		})
	);

	const scanner = new Scanner(
		checkPointGenerator,
		rangeScanner,
		new LoggerMock(),
		new ExceptionLoggerMock()
	);

	const scan = new Scan(
		new Date(),
		0,
		200,
		createDummyHistoryBaseUrl(),
		1,
		100
	); //should result in two chunks

	const result = await scanner.scan(scan);
	expect(result.isOk()).toBeTruthy();

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

it('should pickup from previous scan', async function () {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);

	const rangeScanner = mock<RangeScanner>();
	rangeScanner.scan.mockResolvedValue(
		ok({
			latestLedgerHeader: { ledger: 100, hash: 'ledger_hash' },
			scannedBucketHashes: new Set(['a'])
		})
	);

	const scanner = new Scanner(
		checkPointGenerator,
		rangeScanner,
		new LoggerMock(),
		new ExceptionLoggerMock()
	);

	const scan = new Scan(
		new Date(),
		0,
		100,
		createDummyHistoryBaseUrl(),
		1,
		100
	); //should result in two chunks

	scan.latestScannedLedger = -1;
	scan.latestScannedLedgerHeaderHash = 'previous_ledger';
	const result = await scanner.scan(scan);
	expect(result.isOk()).toBeTruthy();

	expect(rangeScanner.scan).toHaveBeenCalledTimes(1); //three chunks
	expect(rangeScanner.scan).toHaveBeenLastCalledWith(
		{ value: 'https://history0.stellar.org' },
		1,
		100,
		0,
		-1,
		'previous_ledger',
		new Set([])
	);
});
