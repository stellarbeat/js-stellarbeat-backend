import { FileNotFoundError, QueueError, RequestMethod } from '../../HttpQueue';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { mapHttpQueueErrorToScanError } from '../mapHttpQueueErrorToScanError';
import {
	ScanError,
	FileNotFoundError as FileNotFoundScanError
} from '../ScanError';

it('should map to scan error', function () {
	const error = new QueueError({
		url: createDummyHistoryBaseUrl(),
		meta: { checkPoint: 100 },
		method: RequestMethod.GET
	});

	const mappedError = mapHttpQueueErrorToScanError(error);

	expect(mappedError).toBeInstanceOf(ScanError);
});

it('should map to gap error', function () {
	const error = new FileNotFoundError({
		url: createDummyHistoryBaseUrl(),
		meta: { checkPoint: 100 },
		method: RequestMethod.GET
	});

	const mappedError = mapHttpQueueErrorToScanError(error);

	expect(mappedError).toBeInstanceOf(FileNotFoundScanError);
});
