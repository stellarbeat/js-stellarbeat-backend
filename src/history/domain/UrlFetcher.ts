import { err, ok, Result } from 'neverthrow';
import { Url } from '../../shared/domain/Url';
import { inject, injectable } from 'inversify';
import { HttpError, HttpService } from '../../shared/services/HttpService';
import { Logger } from '../../shared/services/PinoLogger';
import { isObject } from '../../shared/utilities/TypeGuards';
import { AsyncFunctionStaller } from '../../shared/utilities/AsyncFunctionStaller';

export interface FetchError {
	url: Url;
	responseStatus?: number;
	message: string;
	errorType: FetchErrorType;
}

export enum FetchErrorType {
	RATE_LIMIT,
	TIMEOUT,
	GENERAL
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
			undefined,
			'json',
			10000
		);
		const elapsed = new Date().getTime() - time;
		this.fetchTimings.push(elapsed);

		if (fetchResultOrError.isErr()) {
			return err(UrlFetcher.parseError(fetchResultOrError.error, url));
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
			10000
		);
		const elapsed = new Date().getTime() - time;
		this.existTimings.push(elapsed);

		if (resultOrError.isErr()) {
			return err(UrlFetcher.parseError(resultOrError.error, url));
		} else {
			const result = resultOrError.value;
			if (result.status === 200) return ok(true);
			else {
				return ok(false);
			}
		}
	}

	private static parseError(error: HttpError, url: Url): FetchError {
		if (error.code === 'ECONNABORTED') {
			return {
				url: url,
				errorType: FetchErrorType.TIMEOUT,
				message: error.message
			};
		}
		if (error.response?.status === 429) {
			return {
				url: url,
				responseStatus: error.response.status,
				message: error.message,
				errorType: FetchErrorType.RATE_LIMIT
			};
		}

		return {
			url: url,
			responseStatus: error.response?.status,
			message: error.message,
			errorType: FetchErrorType.GENERAL
		};
	}
}
