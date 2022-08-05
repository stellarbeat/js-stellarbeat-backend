import 'reflect-metadata';
import { Url } from '../../shared/domain/Url';
import { eachLimit, ErrorCallback } from 'async';
import { inject, injectable } from 'inversify';
import { Logger } from '../../shared/services/PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { CustomError } from '../../shared/errors/CustomError';
import { asyncSleep } from '../../shared/utilities/asyncSleep';
import { retryHttpRequestIfNeeded } from '../../shared/utilities/HttpRequestRetry';
import { stall } from '../../shared/utilities/AsyncFunctionStaller';
import {
	HttpError,
	HttpOptions,
	HttpResponse,
	HttpService
} from '../../shared/services/HttpService';
import { isObject } from '../../shared/utilities/TypeGuards';
import * as http from 'http';
import * as https from 'https';

export class QueueError<
	Meta extends Record<string, unknown>
> extends CustomError {
	constructor(
		public request: Request<Meta>,
		cause?: HttpError | Error,
		message: string = 'Error executing request' + request.url,
		name = QueueError.name
	) {
		super(message, name, cause);
	}
}

export class FileNotFoundError<
	Meta extends Record<string, unknown>
> extends QueueError<Meta> {
	constructor(public request: Request<Meta>) {
		super(
			request,
			undefined,
			'File not found: ' + request.url,
			FileNotFoundError.name
		);
	}
}

export interface Request<Meta extends Record<string, unknown>> {
	meta: Meta;
	url: Url;
}

@injectable()
export class HttpQueue {
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		@inject('Logger') private logger: Logger
	) {}

	async exists<Meta extends Record<string, unknown>>(
		requests: IterableIterator<Request<Meta>>,
		concurrency: number,
		httpAgent: http.Agent, //todo should pass HttpOptions
		httpsAgent: https.Agent,
		rampUpConnections = false
	): Promise<Result<void, QueueError<Meta>>> {
		let counter = 0;

		const worker = async (
			request: Request<Meta>,
			callback: ErrorCallback<QueueError<Meta>>
		) => {
			counter++;
			if (counter <= concurrency && rampUpConnections) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
			}

			const result = await this.performHeadRequest(
				request,
				httpAgent,
				httpsAgent
			);

			if (result.isOk()) {
				callback();
			} else callback(HttpQueue.parseError(result.error, request));
		};

		try {
			await eachLimit(requests, concurrency, worker);
			return ok(undefined);
		} catch (error) {
			if (error instanceof QueueError) return err(error);
			throw error; //should not happen as worker returns QueueErrors, but cannot seem to typehint this correctly
		}
	}

	private async performHeadRequest<Meta extends Record<string, unknown>>(
		request: Request<Meta>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	) {
		return await retryHttpRequestIfNeeded(
			5,
			stall as (
				minTimeMs: number,
				operation: (
					url: Url,
					httpOptions: HttpOptions
				) => Promise<Result<HttpResponse<unknown>, HttpError<unknown>>>,
				url: Url,
				httpOptions: HttpOptions
			) => Promise<Result<HttpResponse<unknown>, HttpError<unknown>>>, //todo: how can we pass generics here?
			150,
			this.httpService.head.bind(this.httpService),
			request.url,
			{
				responseType: undefined,
				timeoutMs: 10000,
				httpAgent: httpAgent,
				httpsAgent: httpsAgent
			}
		);
	}

	async get<Meta extends Record<string, unknown>>( //resulthandler needs cleaner solution
		requests: IterableIterator<Request<Meta>>,
		resultHandler: (result: Record<string, unknown>) => Error | undefined,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		rampUpConnections = false
	): Promise<Result<void, QueueError<Meta>>> {
		let counter = 0;

		const getWorker = async (
			request: Request<Meta>,
			callback: ErrorCallback<QueueError<Meta>>
		) => {
			counter++;
			if (counter <= concurrency && rampUpConnections) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
			}
			const result = await this.performGetRequest(
				request,
				httpAgent,
				httpsAgent
			);

			if (result.isOk()) {
				const data = result.value.data;
				//could be handed to a validate function supplied as a parameter to make more generic
				if (isObject(data)) {
					const error = resultHandler(data);
					//idea: httpqueue being an event emitter would be a cleaner solution. And should have a 'clear queue' function
					if (error) callback(new QueueError(request, error));
					else {
						callback();
					}
				} else {
					callback(new FileNotFoundError(request));
				}
			} else callback(HttpQueue.parseError(result.error, request));
		};

		try {
			await eachLimit(requests, concurrency, getWorker);
			return ok(undefined);
		} catch (error) {
			if (error instanceof QueueError) return err(error);
			throw error; //should not happen as worker returns QueueErrors, but cannot seem to typehint this correctly
		}
	}

	private async performGetRequest<Meta extends Record<string, unknown>>(
		request: Request<Meta>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	) {
		return await retryHttpRequestIfNeeded(
			5,
			stall as (
				minTimeMs: number,
				operation: (
					url: Url,
					httpOptions: HttpOptions
				) => Promise<Result<HttpResponse<unknown>, HttpError<unknown>>>,
				url: Url,
				httpOptions: HttpOptions
			) => Promise<Result<HttpResponse<unknown>, HttpError<unknown>>>, //todo: how can we pass generics here?
			150,
			this.httpService.get.bind(this.httpService),
			request.url,
			{
				responseType: 'json',
				timeoutMs: 10000,
				httpAgent: httpAgent,
				httpsAgent: httpsAgent
			}
		);
	}

	private static parseError<Meta extends Record<string, unknown>>(
		error: HttpError,
		request: Request<Meta>
	): QueueError<Meta> {
		if (
			error.code &&
			['ETIMEDOUT', 'ECONNABORTED', 'TIMEOUT', 'ERR_REQUEST_ABORTED'].includes(
				error.code
			)
		) {
			//return new TimeoutError(error);
			return new QueueError<Meta>(request, error);
		}

		if (error.response?.status === 429) {
			//return new RateLimitError(error);
			return new QueueError<Meta>(request, error);
		}

		if (error.response?.status === 404) {
			return new FileNotFoundError<Meta>(request);
		}

		return new QueueError<Meta>(request, error);
	}
}
