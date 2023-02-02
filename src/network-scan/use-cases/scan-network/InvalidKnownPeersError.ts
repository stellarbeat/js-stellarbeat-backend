import { CustomError } from '../../../core/errors/CustomError';

export class InvalidKnownPeersError extends CustomError {
	constructor(cause?: Error) {
		super(
			`Invalid known peer detected in configuration`,
			InvalidKnownPeersError.name,
			cause
		);
	}
}
