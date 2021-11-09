import { CustomError } from '../../../shared/errors/CustomError';

export class SubscribeError extends CustomError {
	errorType = 'SubscribeError';
}
