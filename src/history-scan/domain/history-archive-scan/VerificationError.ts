import { CustomError } from '../../../shared/errors/CustomError';
import { Category } from '../history-archive/Category';

export class VerificationError extends CustomError {
	constructor(public ledger: number, public category: Category) {
		super('Verification error', VerificationError.name);
	}
}
