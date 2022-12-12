import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../core/services/PinoLogger';
import { CustomError } from '../../../core/errors/CustomError';
import Ajv, { ValidateFunction } from 'ajv';
import {
	HistoryArchiveState,
	HistoryArchiveStateSchema
} from './HistoryArchiveState';

export class InvalidHASError extends CustomError {
	constructor(message: string) {
		super('Invalid HAS file: ' + message, InvalidHASError.name);
	}
}

@injectable()
export class HASValidator {
	private readonly validateHistoryArchiveState: ValidateFunction<HistoryArchiveState>;

	constructor(@inject('Logger') protected logger: Logger) {
		const ajv = new Ajv();
		this.validateHistoryArchiveState = ajv.compile(HistoryArchiveStateSchema); //todo this probably needs to move higher up the chain...
	}

	validate(
		historyArchiveStateRaw: Record<string, unknown>
	): Result<HistoryArchiveState, InvalidHASError> {
		const validate = this.validateHistoryArchiveState;
		if (validate(historyArchiveStateRaw)) {
			return ok(historyArchiveStateRaw);
		}

		const errors = validate.errors;
		if (errors === undefined || errors === null)
			return err(new InvalidHASError('Unknown error'));
		return err(new InvalidHASError(errors.toString()));
	}
}
