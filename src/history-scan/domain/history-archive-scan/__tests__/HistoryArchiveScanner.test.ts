import { Scanner } from '../HistoryArchiveScanner';
import { CheckPointGenerator } from '../../check-point/CheckPointGenerator';
import { StandardCheckPointFrequency } from '../../check-point/StandardCheckPointFrequency';
import { LoggerMock } from '../../../../shared/services/__mocks__/LoggerMock';
import { HttpQueue } from '../../HttpQueue';
import { mock } from 'jest-mock-extended';
import { ExceptionLoggerMock } from '../../../../shared/services/__mocks__/ExceptionLoggerMock';
import { Scan } from '../HistoryArchiveScan';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { ok } from 'neverthrow';
import { RangeScanner } from '../HistoryArchiveRangeScanner';
import exp = require('constants');

//todo write chunking test

it('should scan', async function () {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);

	const historyArchiveRangeScanner = mock<RangeScanner>();
	historyArchiveRangeScanner.scan.mockResolvedValue(ok(undefined));

	const httpQueue = mock<HttpQueue>();
	httpQueue.sendRequests.mockResolvedValue(ok(undefined));
	const historyArchiveScanner = new Scanner(
		checkPointGenerator,
		historyArchiveRangeScanner,
		new LoggerMock(),
		new ExceptionLoggerMock()
	);

	const historyArchiveScan = new Scan(
		new Date(),
		0,
		300,
		createDummyHistoryBaseUrl(),
		1,
		100
	); //should result in three chunks

	const result = await historyArchiveScanner.perform(historyArchiveScan);
	expect(result.isOk()).toBeTruthy();

	expect(historyArchiveRangeScanner.scan).toHaveBeenCalledTimes(3); //three chunks
	expect(historyArchiveRangeScanner.scan).toHaveBeenLastCalledWith(
		{ value: 'https://history0.stellar.org' },
		1,
		300,
		200,
		200,
		undefined
	);
});
