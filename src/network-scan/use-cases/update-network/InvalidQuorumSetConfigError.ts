import { CustomError } from '../../../core/errors/CustomError';

export class InvalidQuorumSetConfigError extends CustomError {
	constructor() {
		super('Invalid quorum set configuration', InvalidQuorumSetConfigError.name);
	}
}
