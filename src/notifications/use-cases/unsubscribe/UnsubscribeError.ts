import { CustomError } from '../../../core/errors/CustomError';
import { UnmuteNotificationError } from '../unmute-notification/UnmuteNotificationError';

export class UnsubscribeError extends CustomError {
	errorType = 'UnsubscribeError';
}

export class SubscriberNotFoundError extends UnsubscribeError {
	constructor(subscriberRef: string) {
		super(
			`No subscriber found with id ${subscriberRef}`,
			SubscriberNotFoundError.name
		);
	}
}

export class PersistenceError extends UnmuteNotificationError {
	constructor(cause: Error) {
		super(`Persistence error`, PersistenceError.name, cause);
	}
}
