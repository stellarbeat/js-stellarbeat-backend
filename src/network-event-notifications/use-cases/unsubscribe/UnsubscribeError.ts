import { CustomError } from '../../../shared/errors/CustomError';

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
