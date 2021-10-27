import { CustomError } from '../../../errors/CustomError';

export class NotifyContactsError extends CustomError {
	errorType = 'NotifyContactsError';
}

export class InCompleteNetworkError extends NotifyContactsError {
	constructor(networkUpdateTime: Date, cause?: Error) {
		super(
			`Network at time ${networkUpdateTime} has incomplete data.`,
			InCompleteNetworkError.name,
			cause
		);
	}
}

export class InCompletePreviousNetworkError extends NotifyContactsError {
	constructor(networkUpdateTime: Date, cause?: Error) {
		super(
			`Previous network at time ${networkUpdateTime} has incomplete data.`,
			InCompleteNetworkError.name,
			cause
		);
	}
}

export class NoPreviousNetworkError extends NotifyContactsError {
	constructor(networkUpdateTime: Date) {
		super(
			`No previous network found for network at time ${networkUpdateTime}. First update?`,
			NoPreviousNetworkError.name
		);
	}
}

export class NoNetworkError extends NotifyContactsError {
	constructor(networkUpdateTime: Date) {
		super(
			`No network found at time ${networkUpdateTime}.`,
			NoPreviousNetworkError.name
		);
	}
}

export class NetworkStatisticsIncompleteError extends NotifyContactsError {
	constructor(networkUpdateTime: Date, cause: Error) {
		super(
			`Network statistics incomplete at time ${networkUpdateTime}.`,
			NoPreviousNetworkError.name,
			cause
		);
	}
}
