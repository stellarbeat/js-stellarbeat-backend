import { CheckPointGenerator } from '../../check-point/CheckPointGenerator';
import { StandardCheckPointFrequency } from '../../check-point/StandardCheckPointFrequency';
import { LoggerMock } from '../../../../shared/services/__mocks__/LoggerMock';
import { HttpQueue } from '../../HttpQueue';
import { mock } from 'jest-mock-extended';
import { ExceptionLoggerMock } from '../../../../shared/services/__mocks__/ExceptionLoggerMock';
import { ok } from 'neverthrow';
import { CategoryScanner } from '../CategoryScanner';
import { BucketScanner } from '../BucketScanner';
import { RangeScanner } from '../HistoryArchiveRangeScanner';

it('should scan', async function () {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);

	const categoryScanner = mock<CategoryScanner>();
	const bucketScanner = mock<BucketScanner>();
	categoryScanner.scanHASFilesAndReturnBucketHashes.mockResolvedValue(
		ok(new Set(['a', 'b']))
	);
	categoryScanner.scanOtherCategories.mockResolvedValue(ok(undefined));
	bucketScanner.scan.mockResolvedValue(ok(undefined));

	const httpQueue = mock<HttpQueue>();
	httpQueue.sendRequests.mockResolvedValue(ok(undefined));
	const historyArchiveRangeScanner = new RangeScanner(
		checkPointGenerator,
		categoryScanner,
		bucketScanner,
		httpQueue,
		new LoggerMock(),
		new ExceptionLoggerMock()
	);

	const result = await historyArchiveRangeScanner.scan(
		{ value: 'url' },
		1,
		50,
		0,
		0
	);
	expect(result.isOk()).toBeTruthy();

	expect(
		categoryScanner.scanHASFilesAndReturnBucketHashes
	).toHaveBeenCalledTimes(1); //three chunks
	expect(categoryScanner.scanOtherCategories).toHaveBeenCalledTimes(1); //three chunks
	expect(bucketScanner.scan).toHaveBeenCalledTimes(1);
});
