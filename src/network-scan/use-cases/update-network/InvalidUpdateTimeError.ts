import { CustomError } from '../../../core/errors/CustomError';

export class InvalidUpdateTimeError extends CustomError {
	constructor() {
		super('Invalid update time', InvalidUpdateTimeError.name);
	}
}
