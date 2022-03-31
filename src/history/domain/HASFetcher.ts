import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { Logger } from '../../shared/services/PinoLogger';
import { FetchError, UrlFetcher } from './UrlFetcher';
import { CustomError } from '../../shared/errors/CustomError';
import Ajv, { ValidateFunction } from 'ajv';
import {
	HistoryArchiveState,
	HistoryArchiveStateSchema
} from './HistoryArchiveState';
import { Url } from '../../shared/domain/Url';

export class InvalidHasError extends CustomError {
	constructor(message: string) {
		super('Invalid HAS file: ' + message, InvalidHasError.name);
	}
}
@injectable()
export class HASFetcher {
	private readonly validateHistoryArchiveState: ValidateFunction<HistoryArchiveState>;

	constructor(
		protected urlFetcher: UrlFetcher,
		@inject('Logger') protected logger: Logger
	) {
		const ajv = new Ajv();
		this.validateHistoryArchiveState = ajv.compile(HistoryArchiveStateSchema); //todo this probably needs to move higher up the chain...
	}

	async fetchHASFile(
		historyCategoryUrl: Url
	): Promise<
		Result<HistoryArchiveState | undefined, InvalidHasError | FetchError>
	> {
		const historyArchiveStateResultOrError = await this.urlFetcher.fetchJSON(
			historyCategoryUrl
		);

		if (historyArchiveStateResultOrError.isErr()) {
			return err(historyArchiveStateResultOrError.error);
		}

		if (historyArchiveStateResultOrError.value === undefined) {
			return ok(undefined);
		}

		const historyArchiveState = historyArchiveStateResultOrError.value;
		const validate = this.validateHistoryArchiveState;
		if (validate(historyArchiveState)) {
			return ok(historyArchiveState);
		}

		const errors = validate.errors;
		if (errors === undefined || errors === null)
			return err(new InvalidHasError('Unknown error'));
		return err(new InvalidHasError(errors.toString()));
	}
}
