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

	private async sendSingleRequest<Meta extends Record<string, unknown>>(
		request: Request<Meta>,
		httpQueueOptions: HttpQueueOptions
	) {
		let url = request.url;
		if (this.cacheBusting) {
			const cacheAvoidingUrl = Url.create(
				url.value + '?param=' + Math.random()
			);
			if (cacheAvoidingUrl.isErr()) throw cacheAvoidingUrl.error;
			url = cacheAvoidingUrl.value;
		}

		return await retryHttpRequestIfNeeded(
			httpQueueOptions.nrOfRetries,
			stall as (
				minTimeMs: number,
				operation: (
					url: Url,
					httpOptions: HttpOptions
				) => Promise<Result<HttpResponse<unknown>, HttpError<unknown>>>,
				url: Url,
				httpOptions: HttpOptions
			) => Promise<Result<HttpResponse<unknown>, HttpError<unknown>>>, //todo: how can we pass generics here?
			httpQueueOptions.stallTimeMs,
			this.mapRequestMethodToOperation(request.method),
			request.url,
			httpQueueOptions.httpOptions
		);
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

	async sendRequests<Meta extends Record<string, unknown>>( //resulthandler needs cleaner solution
		requests: IterableIterator<Request<Meta>>,
		httpQueueOptions: HttpQueueOptions,
		resultHandler?: (
			result: unknown,
			request: Request<Meta>
		) => Promise<QueueError<Meta> | undefined>
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
			const result = await this.sendSingleRequest(request, httpQueueOptions);
			if (result.isOk()) {
				const data = result.value.data;
				if (terminated) {
					//was the queue terminated while sending
					if (data instanceof stream.Readable) data.destroy();
				} else if (resultHandler)
					callback(await resultHandler(result.value.data, request));
				else callback();
			} else callback(HttpQueue.parseError(result.error, request));
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
