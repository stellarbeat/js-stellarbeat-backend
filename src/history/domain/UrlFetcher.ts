import { err, ok, Result } from 'neverthrow';
import { Url } from '../../shared/domain/Url';
import { inject, injectable } from 'inversify';
import { HttpError, HttpService } from '../../shared/services/HttpService';
import { Logger } from '../../shared/services/PinoLogger';
import { isObject } from '../../shared/utilities/TypeGuards';
import { AsyncFunctionStaller } from '../../shared/utilities/AsyncFunctionStaller';
import { CustomError } from '../../shared/errors/CustomError';

export abstract class FetchError extends CustomError {
	public errorType = 'FetchError';
	public abstract cause: HttpError;
}

export class RateLimitError extends FetchError {
	constructor(public cause: HttpError) {
		super('Rate limit hit', RateLimitError.name, cause);
	}
}

export class TimeoutError extends FetchError {
	constructor(public cause: HttpError) {
		super('Timeout', TimeoutError.name, cause);
	}
}

export class ArchiveError extends FetchError {
	constructor(public status: number, message: string, public cause: HttpError) {
		super(message, ArchiveError.name, cause);
	}
}

export class ClientError extends FetchError {
	constructor(message: string, public cause: HttpError) {
		super(message, ClientError.name, cause);
	}
}

@injectable()
export class UrlFetcher {
	public existTimings: number[] = [];
	public fetchTimings: number[] = [];

	constructor(
		@inject('HttpService') protected httpService: HttpService,
		@inject('Logger') protected logger: Logger
	) {}

	async fetchJSON(
		url: Url
	): Promise<Result<Record<string, unknown> | undefined, FetchError>> {
		const time = new Date().getTime();
		//stall function to avoid rate limit when hitting cache
		const fetchResultOrError = await AsyncFunctionStaller.stall(
			150,
			this.httpService.get.bind(this.httpService),
			url,
			{
				responseType: 'json',
				timeoutMs: 10000,
				keepalive: true
			}
		);
		const elapsed = new Date().getTime() - time;
		this.fetchTimings.push(elapsed);

		if (fetchResultOrError.isErr()) {
			if (fetchResultOrError.error.response?.status === 404) {
				return ok(undefined);
			}
			return err(UrlFetcher.parseError(fetchResultOrError.error));
		}

		if (fetchResultOrError.value.status !== 200) {
			return ok(undefined);
		}

		const result = fetchResultOrError.value.data;
		if (!isObject(result)) return ok(undefined);

		return ok(result);
	}

	async exists(url: Url): Promise<Result<boolean, FetchError>> {
		const time = new Date().getTime();

		//stall function to avoid rate limit when hitting cache
		const resultOrError = await AsyncFunctionStaller.stall(
			150,
			this.httpService.head.bind(this.httpService),
			url,
			{
				timeoutMs: 10000,
				keepalive: true
			}
		);
		const elapsed = new Date().getTime() - time;
		this.existTimings.push(elapsed);

		if (resultOrError.isErr()) {
			return err(UrlFetcher.parseError(resultOrError.error));
		} else {
			const result = resultOrError.value;
			if (result.status === 200) return ok(true);
			else {
				return ok(false);
			}
		}
	}

	private static parseError(error: HttpError): FetchError {
		if (
			error.code &&
			['ETIMEDOUT', 'ECONNABORTED', 'TIMEOUT'].includes(error.code)
		) {
			return new TimeoutError(error);
		}

		if (error.response?.status === 429) {
			return new RateLimitError(error);
		}

		if (error.response) {
			return new ArchiveError(
				error.response.status,
				error.response.statusText,
				error
			);
		}

		return new ClientError(error.message, error);
	}
}
