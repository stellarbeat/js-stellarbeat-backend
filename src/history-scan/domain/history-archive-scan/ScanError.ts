import { CustomError } from '../../../shared/errors/CustomError';

export enum ScanErrorType {
	TYPE_VERIFICATION,
	TYPE_CONNECTION
}

export class ScanError extends CustomError {
	constructor(
		public type: ScanErrorType,
		public url: string,
		public message: string
	) {
		super(message, ScanError.name);
	}
}
