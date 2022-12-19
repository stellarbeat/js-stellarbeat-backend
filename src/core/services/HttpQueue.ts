import 'reflect-metadata';
import { Url } from '../domain/Url';
import { eachLimit, ErrorCallback } from 'async';
import { inject, injectable } from 'inversify';
import { Logger } from './PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { CustomError } from '../errors/CustomError';
import { asyncSleep } from '../utilities/asyncSleep';
import { setMaxListeners } from 'events';

import {
	HttpError,
	HttpOptions,
	HttpResponse,
	HttpService
} from './HttpService';
import { instanceOfError } from '../utilities/TypeGuards';

export interface HttpQueueOptions {
	rampUpConnections: boolean; //ramp up connections slowly
	concurrency: number;
	nrOfRetries: number;
	stallTimeMs: number;
	httpOptions: HttpOptions;
	cacheBusting?: boolean;
}
export class QueueError extends CustomError {
	constructor(
		public request: Request,
		cause?: HttpError | Error,
		message: string = 'Error executing request' + request.url,
		name = QueueError.name
	) {
		super(message, name, cause);
	}
}

export class FileNotFoundError extends QueueError {
	constructor(public request: Request) {
		super(
			request,
			undefined,
			'File not found: ' + request.url,
			FileNotFoundError.name
		);
	}
}

export class RetryableQueueError extends QueueError {
	constructor(
		public request: Request,
		cause?: HttpError | Error | unknown,
		message: string = 'Error executing request' + request.url
	) {
		super(
			request,
			instanceOfError(cause) ? cause : undefined,
			message,
			RetryableQueueError.name
		);
	}
}

export enum RequestMethod {
	GET,
	HEAD
}

export interface Request<
	Meta extends Record<string, unknown> = Record<string, unknown>
> {
	meta: Meta;
	url: Url;
	method: RequestMethod;
}

@injectable()
export class HttpQueue {
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		@inject('Logger') private logger: Logger
	) {}

	async sendRequests<
		Meta extends Record<string, unknown> = Record<string, unknown>
	>(
		requests: IterableIterator<Request<Meta>>,
		httpQueueOptions: HttpQueueOptions,
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError>>
	): Promise<Result<void, QueueError>> {
		let counter = 0;
		let activeRequestCount = 0;
		const getWorker = async (
			request: Request<Meta>,
			callback: ErrorCallback<QueueError>
		) => {
			counter++;
			activeRequestCount++;
			if (
				counter <= httpQueueOptions.concurrency &&
				httpQueueOptions.rampUpConnections
			) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
				//was the queue terminated while sleeping?
				if (
					httpQueueOptions.httpOptions.abortSignal &&
					httpQueueOptions.httpOptions.abortSignal.aborted
				) {
					activeRequestCount--;
					callback();
					return;
				}
			}

			const result = await this.processSingleRequestWithRetryAndDelay(
				request,
				httpQueueOptions,
				responseHandler
			);
			activeRequestCount--;

			if (result.isErr()) callback(result.error);
			else callback();
		};

		const abortController = new AbortController();
		setMaxListeners(httpQueueOptions.concurrency, abortController.signal);
		httpQueueOptions.httpOptions.abortSignal = abortController.signal;
		try {
			await eachLimit(requests, httpQueueOptions.concurrency, getWorker);
			return ok(undefined);
		} catch (error) {
			abortController.abort();
			while (activeRequestCount > 0) {
				console.log(
					'Waiting for cleanup of active requests',
					activeRequestCount
				);
				await asyncSleep(1000);
			}
			if (error instanceof QueueError) return err(error);
			throw error; //should not happen as worker returns QueueErrors, but cannot seem to typehint this correctly
		}
	}

	private async processSingleRequestWithRetryAndDelay<
		Meta extends Record<string, unknown>
	>(
		request: Request<Meta>,
		httpQueueOptions: HttpQueueOptions,
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError>>
	): Promise<Result<void, QueueError>> {
		let requestCount = 0;

		let result: Result<void, QueueError>;
		let retry = false;
		do {
			requestCount++;
			result = await this.processSingleRequestWithDelay(
				request,
				httpQueueOptions,
				responseHandler
			);
			retry =
				result.isErr() &&
				result.error instanceof RetryableQueueError &&
				requestCount <= httpQueueOptions.nrOfRetries &&
				!httpQueueOptions.httpOptions.abortSignal?.aborted;
			if (retry && result.isErr()) {
				if (requestCount > 2) {
					console.log(
						'retry',
						requestCount,
						request.url.value,
						result.error.message
					);
				}
				await asyncSleep(Math.pow(2, requestCount) * 1000);
			}
		} while (retry);

		return result;
	}

	//to avoid rate limiting;
	private async processSingleRequestWithDelay<
		Meta extends Record<string, unknown>
	>(
		request: Request<Meta>,
		httpQueueOptions: HttpQueueOptions,
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError>>
	): Promise<Result<void, QueueError>> {
		const time = new Date().getTime();
		const result = await this.processSingleRequest(
			request,
			httpQueueOptions,
			responseHandler
		);

		const elapsed = new Date().getTime() - time;
		if (elapsed < httpQueueOptions.stallTimeMs) {
			await asyncSleep(httpQueueOptions.stallTimeMs - elapsed);
		}
		return result;
	}

	private async processSingleRequest<Meta extends Record<string, unknown>>(
		request: Request<Meta>,
		httpQueueOptions: HttpQueueOptions,
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError>>
	): Promise<Result<void, QueueError>> {
		let url = request.url;
		if (httpQueueOptions.cacheBusting) {
			const cacheAvoidingUrl = Url.create(url.value + '?bust=' + Math.random());
			if (cacheAvoidingUrl.isErr()) throw cacheAvoidingUrl.error;
			url = cacheAvoidingUrl.value;
		}

		const response = await this.mapRequestMethodToOperation(request.method)(
			url,
			httpQueueOptions.httpOptions
		);

		return await HttpQueue.handleResponse(request, response, responseHandler);
	}

	private static async handleResponse<Meta extends Record<string, unknown>>(
		request: Request<Meta>,
		response: Result<HttpResponse, HttpError>,
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError>>
	) {
		if (response.isOk()) {
			if (responseHandler) {
				return await responseHandler(response.value.data, request);
			} else return ok(undefined);
		} else {
			return err(HttpQueue.parseError(response.error, request));
		}
	}

	private mapRequestMethodToOperation(
		method: RequestMethod
	): (
		url: Url,
		httpOptions: HttpOptions
	) => Promise<Result<HttpResponse, HttpError>> {
		if (method === RequestMethod.HEAD)
			return this.httpService.head.bind(this.httpService);
		if (method === RequestMethod.GET)
			return this.httpService.get.bind(this.httpService);

		throw new Error('Unknown request method');
	}

	private static parseError<Meta extends Record<string, unknown>>(
		error: HttpError,
		request: Request<Meta>
	): QueueError {
		if (
			error.code &&
			[
				'ETIMEDOUT',
				'ECONNABORTED',
				'TIMEOUT',
				'ERR_REQUEST_ABORTED',
				'SB_CONN_TIMEOUT'
			].includes(error.code)
		) {
			return new RetryableQueueError(request, error);
		}

		if (error.response?.status === 429) {
			return new RetryableQueueError(request, error);
		}

		if (error.response?.status === 404) {
			return new FileNotFoundError(request);
		}

		return new RetryableQueueError(request, error);
	}
}
