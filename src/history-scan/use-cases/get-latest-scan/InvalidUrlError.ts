import { CustomError } from '../../../core/errors/CustomError';

export class InvalidUrlError extends CustomError {
	constructor(url: string) {
		super(`Invalid url: ${url}`, InvalidUrlError.name);
	}
}
