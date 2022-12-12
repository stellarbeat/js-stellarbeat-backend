import { CustomError } from '../../../core/errors/CustomError';

export class NotifyError extends CustomError {
	errorType = 'NotifyError';
}

export class PersistenceError extends NotifyError {
	constructor(cause: Error) {
		super(`Persistence error`, PersistenceError.name, cause);
	}
}

export class InCompleteNetworkError extends NotifyError {
	constructor(networkUpdateTime: Date, cause?: Error) {
		super(
			`Network at time ${networkUpdateTime} has incomplete data.`,
			InCompleteNetworkError.name,
			cause
		);
	}
}

export class InCompletePreviousNetworkError extends NotifyError {
	constructor(networkUpdateTime: Date, cause?: Error) {
		super(
			`Previous network at time ${networkUpdateTime} has incomplete data.`,
			InCompleteNetworkError.name,
			cause
		);
	}
}

export class NoPreviousNetworkError extends NotifyError {
	constructor(networkUpdateTime: Date) {
		super(
			`No previous network found for network at time ${networkUpdateTime}. First update?`,
			NoPreviousNetworkError.name
		);
	}
}

export class NoNetworkError extends NotifyError {
	constructor(networkUpdateTime: Date) {
		super(
			`No network found at time ${networkUpdateTime}.`,
			NoPreviousNetworkError.name
		);
	}
}

export class NetworkStatisticsIncompleteError extends NotifyError {
	constructor(networkUpdateTime: Date, cause: Error) {
		super(
			`Network statistics incomplete at time ${networkUpdateTime}.`,
			NoPreviousNetworkError.name,
			cause
		);
	}
}
