import {
	FileNotFoundError,
	QueueError
} from '../../../core/services/HttpQueue';
import 'reflect-metadata';
import { ScanError, ScanErrorType } from '../scan/ScanError';

export function mapHttpQueueErrorToScanError(error: QueueError): ScanError {
	if (error instanceof FileNotFoundError) {
		return new ScanError(
			ScanErrorType.TYPE_VERIFICATION,
			error.request.url.value,
			'File not found'
		);
	}
	if (error.cause instanceof ScanError) {
		return error.cause;
	}
	return new ScanError(
		ScanErrorType.TYPE_CONNECTION,
		error.request.url.value,
		error.cause?.message ?? 'Connection error'
	);
}
