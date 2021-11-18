import { CustomError } from '../../../shared/errors/CustomError';

export class ConfirmSubscriptionError extends CustomError {
	errorType = 'ConfirmSubscriptionError';
}

export class NoPendingSubscriptionFound extends ConfirmSubscriptionError {
	constructor() {
		super(`No pending subscription found`, NoPendingSubscriptionFound.name);
	}
}
