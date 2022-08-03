import { CustomError } from '../../../shared/errors/CustomError';
import { Url } from '../../../shared/domain/Url';

export class GapFoundError extends CustomError {
	constructor(public url: Url, public checkPoint?: number) {
		super('Gap found', GapFoundError.name);
	}
}
