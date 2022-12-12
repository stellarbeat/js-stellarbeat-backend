import { CustomError } from '../../../core/errors/CustomError';

export class SubscribeError extends CustomError {
	errorType = 'SubscribeError';
}

export class PersistenceError extends SubscribeError {
	constructor(cause: Error) {
		super(`Persistence error`, PersistenceError.name, cause);
	}
}
