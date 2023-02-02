import { CustomError } from '../../../../../core/errors/CustomError';

export abstract class OrganizationScanError extends CustomError {
	private organizationScanErrorType = 'OrganizationScanError'; //to break duck-typing

	constructor(message: string, name: string, cause?: Error) {
		super(message, OrganizationScanError.name, cause);
	}
}
