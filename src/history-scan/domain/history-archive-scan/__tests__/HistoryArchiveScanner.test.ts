import { HistoryArchiveScanner } from '../HistoryArchiveScanner';
import { CheckPointGenerator } from '../../check-point/CheckPointGenerator';
import { StandardCheckPointFrequency } from '../../check-point/StandardCheckPointFrequency';
import { LoggerMock } from '../../../../shared/services/__mocks__/LoggerMock';
import { HttpQueue } from '../../HttpQueue';
import { mock } from 'jest-mock-extended';
import { ExceptionLoggerMock } from '../../../../shared/services/__mocks__/ExceptionLoggerMock';
import { HistoryArchiveScan } from '../HistoryArchiveScan';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { ok } from 'neverthrow';
import { HASFilesScanner } from '../HASFilesScanner';

it('should scan', async function () {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);

	const HASFilesScanner = mock<HASFilesScanner>();
	HASFilesScanner.scanHASFilesAndReturnBucketHashes.mockResolvedValue(
		ok(new Set(['a', 'b']))
	);

	const httpQueue = mock<HttpQueue>();
	httpQueue.exists.mockResolvedValue(ok(undefined));
	const historyArchiveScanner = new HistoryArchiveScanner(
		checkPointGenerator,
		HASFilesScanner,
		httpQueue,
		new LoggerMock(),
		new ExceptionLoggerMock()
	);

	const historyArchiveScan = new HistoryArchiveScan(
		new Date(),
		0,
		300,
		createDummyHistoryBaseUrl(),
		100
	); //should result in three chunks

	const result = await historyArchiveScanner.perform(historyArchiveScan);
	expect(result.isOk()).toBeTruthy();

	expect(
		HASFilesScanner.scanHASFilesAndReturnBucketHashes
	).toHaveBeenCalledTimes(3); //three chunks
	expect(httpQueue.exists).toHaveBeenCalledTimes(6); //three calls to buckets exist, three calls to other categories exist
});
