import 'reflect-metadata';
import { Url } from '../../shared/domain/Url';
import { eachLimit, ErrorCallback } from 'async';
import { inject, injectable } from 'inversify';
import { Logger } from '../../shared/services/PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { CustomError } from '../../shared/errors/CustomError';
import { asyncSleep } from '../../shared/utilities/asyncSleep';

import {
	HttpError,
	HttpOptions,
	HttpResponse,
	HttpService
} from '../../shared/services/HttpService';
import * as stream from 'stream';

export interface HttpQueueOptions {
	rampUpConnections: boolean; //ramp up connections slowly
	concurrency: number;
	nrOfRetries: number;
	stallTimeMs: number;
	httpOptions: HttpOptions;
}
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

export class RetryableQueueError<
	Meta extends Record<string, unknown>
> extends QueueError<Meta> {
	constructor(
		public request: Request<Meta>,
		cause?: HttpError | Error,
		message: string = 'Error executing request' + request.url
	) {
		super(request, cause, message, RetryableQueueError.name);
	}
}

export enum RequestMethod {
	GET,
	HEAD
}

export interface Request<Meta extends Record<string, unknown>> {
	meta: Meta;
	url: Url;
	method: RequestMethod;
}

@injectable()
export class HttpQueue {
	public cacheBusting = false; //todo: move to http options
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		@inject('Logger') private logger: Logger
	) {}

	async sendRequests<Meta extends Record<string, unknown>>( //resulthandler needs cleaner solution
		requests: IterableIterator<Request<Meta>>,
		httpQueueOptions: HttpQueueOptions,
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError<Meta>>>
	): Promise<Result<void, QueueError<Meta>>> {
		let counter = 0;
		let terminated = false;
		const getWorker = async (
			request: Request<Meta>,
			callback: ErrorCallback<QueueError<Meta>>
		) => {
			counter++;
			if (
				counter <= httpQueueOptions.concurrency &&
				httpQueueOptions.rampUpConnections
			) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
				//was the queue terminated while sleeping?
				if (terminated) {
					callback();
					return;
				}
			}

			const result = await this.processSingleRequestWithRetryAndDelay(
				request,
				httpQueueOptions,
				() => terminated,
				responseHandler
			);

			if (result.isErr()) callback(result.error);
			else callback();
		};

		try {
			await eachLimit(requests, httpQueueOptions.concurrency, getWorker);
			return ok(undefined);
		} catch (error) {
			terminated = true;
			if (error instanceof QueueError) return err(error);
			throw error; //should not happen as worker returns QueueErrors, but cannot seem to typehint this correctly
		}
	}

	private async processSingleRequestWithRetryAndDelay<
		Meta extends Record<string, unknown>
	>(
		request: Request<Meta>,
		httpQueueOptions: HttpQueueOptions,
		requestCanceled: () => boolean, //if queue is terminated, this function should return true
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError<Meta>>>
	): Promise<Result<void, QueueError<Meta>>> {
		let requestCount = 0;

		let result: Result<void, QueueError<Meta>>;
		let retry = false;
		do {
			requestCount++;
			result = await this.processSingleRequestWithDelay(
				request,
				httpQueueOptions,
				requestCanceled,
				responseHandler
			);
			retry =
				result.isErr() &&
				result.error instanceof RetryableQueueError &&
				requestCount <= httpQueueOptions.nrOfRetries;
			if (retry) console.log('retry');
		} while (retry);

		return result;
	}

	//to avoid rate limiting;
	private async processSingleRequestWithDelay<
		Meta extends Record<string, unknown>
	>(
		request: Request<Meta>,
		httpQueueOptions: HttpQueueOptions,
		requestCanceled: () => boolean, //if queue is terminated, this function should return true
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError<Meta>>>
	): Promise<Result<void, QueueError<Meta>>> {
		const time = new Date().getTime();
		const result = await this.processSingleRequest(
			request,
			httpQueueOptions,
			requestCanceled,
			responseHandler
		);

		const elapsed = new Date().getTime() - time;
		if (elapsed < httpQueueOptions.stallTimeMs)
			await asyncSleep(httpQueueOptions.stallTimeMs - elapsed);

		return result;
	}

	private async processSingleRequest<Meta extends Record<string, unknown>>(
		request: Request<Meta>,
		httpQueueOptions: HttpQueueOptions,
		requestCanceled: () => boolean, //if queue is terminated, this function should return true
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError<Meta>>>
	): Promise<Result<void, QueueError<Meta>>> {
		let url = request.url;
		if (this.cacheBusting) {
			const cacheAvoidingUrl = Url.create(
				url.value + '?param=' + Math.random()
			);
			if (cacheAvoidingUrl.isErr()) throw cacheAvoidingUrl.error;
			url = cacheAvoidingUrl.value;
		}

		const response = await this.mapRequestMethodToOperation(request.method)(
			url,
			httpQueueOptions.httpOptions
		);

		return await HttpQueue.handleResponse(
			request,
			response,
			requestCanceled,
			responseHandler
		);
	}

	private static async handleResponse<Meta extends Record<string, unknown>>(
		request: Request<Meta>,
		response: Result<HttpResponse, HttpError>,
		requestCanceled: () => boolean, //if queue is terminated, this function should return true
		responseHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<Result<void, QueueError<Meta>>>
	) {
		if (response.isOk()) {
			const data = response.value.data;
			if (requestCanceled()) {
				//was the queue terminated while sending
				if (data instanceof stream.Readable) data.destroy();
				return ok(undefined);
			} else if (responseHandler) {
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
	) => Promise<Result<HttpResponse<unknown>, HttpError<unknown>>> {
		if (method === RequestMethod.HEAD)
			return this.httpService.head.bind(this.httpService);
		if (method === RequestMethod.GET)
			return this.httpService.get.bind(this.httpService);

		throw new Error('Unknown request method');
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
			return new RetryableQueueError<Meta>(request, error);
		}

		if (error.response?.status === 429) {
			//return new RateLimitError(error);
			return new RetryableQueueError<Meta>(request, error);
		}

		if (error.response?.status === 404) {
			return new FileNotFoundError<Meta>(request);
		}

		return new RetryableQueueError<Meta>(request, error);
	}
}
