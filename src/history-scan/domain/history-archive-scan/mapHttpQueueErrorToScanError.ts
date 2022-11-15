import { FileNotFoundError, QueueError } from '../HttpQueue';
import 'reflect-metadata';
import { ScanError, ScanErrorType } from './ScanError';

export function mapHttpQueueErrorToScanError(error: QueueError): ScanError {
	if (error instanceof FileNotFoundError) {
		return new ScanError(
			ScanErrorType.TYPE_VERIFICATION,
			error.request.url.value,
			'File not found'
		);
	}
	return new ScanError(
		ScanErrorType.TYPE_CONNECTION,
		error.request.url.value,
		error.cause?.message
	);
}
