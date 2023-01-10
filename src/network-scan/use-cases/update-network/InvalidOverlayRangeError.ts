import { CustomError } from '../../../core/errors/CustomError';

export class InvalidOverlayRangeError extends CustomError {
	constructor() {
		super('Invalid overlay range', InvalidOverlayRangeError.name);
	}
}
