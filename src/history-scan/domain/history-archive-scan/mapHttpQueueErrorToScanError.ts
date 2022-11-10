import { FileNotFoundError, QueueError } from '../HttpQueue';
import 'reflect-metadata';
import {
	FileNotFoundError as FileNotFoundScanError,
	ConnectionError,
	ScanError
} from './ScanError';

export function mapHttpQueueErrorToScanError(error: QueueError): ScanError {
	if (error instanceof FileNotFoundError) {
		return new FileNotFoundScanError(error.request.url.value);
	}
	return new ConnectionError(error.request.url.value, error.cause?.message);
}
