import { FileNotFoundError, QueueError, RequestMethod } from '../../HttpQueue';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { mapHttpQueueErrorToScanError } from '../mapHttpQueueErrorToScanError';
import { ScanError } from '../HistoryArchiveScanner';
import { GapFoundError } from '../GapFoundError';

it('should map to scan error', function () {
	const error = new QueueError({
		url: createDummyHistoryBaseUrl(),
		meta: { checkPoint: 100 },
		method: RequestMethod.GET
	});

	const mappedError = mapHttpQueueErrorToScanError(error, 100);

	expect(mappedError).toBeInstanceOf(ScanError);
	expect(mappedError.checkPoint).toEqual(100);
});

it('should map to gap error', function () {
	const error = new FileNotFoundError({
		url: createDummyHistoryBaseUrl(),
		meta: { checkPoint: 100 },
		method: RequestMethod.GET
	});

	const mappedError = mapHttpQueueErrorToScanError(error, 100);

	expect(mappedError).toBeInstanceOf(GapFoundError);
	expect(mappedError.checkPoint).toEqual(100);
});
