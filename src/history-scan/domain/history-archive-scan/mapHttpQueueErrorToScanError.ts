import { FileNotFoundError, QueueError } from '../HttpQueue';
import { GapFoundError } from './GapFoundError';
import { ScanError } from './HistoryArchiveScanner';
import 'reflect-metadata';

export function mapHttpQueueErrorToScanError(
	error: QueueError<Record<string, unknown>>,
	checkPoint: number | undefined
): ScanError {
	console.log(error);
	if (error instanceof FileNotFoundError) {
		return new GapFoundError(error.request.url, checkPoint);
	}
	return new ScanError(error.request.url, error.cause, checkPoint);
}
