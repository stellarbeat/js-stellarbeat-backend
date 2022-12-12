import { CustomError } from '../../../core/errors/CustomError';

export class ConfirmSubscriptionError extends CustomError {
	errorType = 'ConfirmSubscriptionError';
}

export class NoPendingSubscriptionFound extends ConfirmSubscriptionError {
	constructor() {
		super(`No pending subscription found`, NoPendingSubscriptionFound.name);
	}
}

export class PersistenceError extends ConfirmSubscriptionError {
	constructor(cause: Error) {
		super(`Persistence error`, PersistenceError.name, cause);
	}
}
