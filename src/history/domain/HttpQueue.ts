import { Url } from '../../shared/domain/Url';
import { eachLimit, ErrorCallback } from 'async';
import { inject, injectable } from 'inversify';
import { Logger } from '../../shared/services/PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { CustomError } from '../../shared/errors/CustomError';
import { mapUnknownToError } from '../../shared/utilities/mapUnknownToError';
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
		public queueUrl: QueueUrl<Meta>,
		cause?: HttpError | Error,
		message: string = 'Error executing request' + queueUrl.url,
		name = QueueError.name
	) {
		super(message, name, cause);
	}
}

export class FileNotFoundError<
	Meta extends Record<string, unknown>
> extends QueueError<Meta> {
	constructor(public queueUrl: QueueUrl<Meta>) {
		super(
			queueUrl,
			undefined,
			'File not found: ' + queueUrl.url,
			FileNotFoundError.name
		);
	}
}

export interface QueueUrl<Meta extends Record<string, unknown>> {
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
		urls: IterableIterator<QueueUrl<Meta>>,
		concurrency: number,
		httpAgent: http.Agent, //todo should pass HttpOptions
		httpsAgent: https.Agent,
		rampUpConnections = false
	): Promise<Result<void, QueueError<Meta> | Error>> {
		let completedTaskCounter = 0;
		let counter = 0;

		const worker = async (
			queueUrl: QueueUrl<Meta>,
			callback: ErrorCallback<QueueError<Meta>>
		) => {
			counter++;
			if (counter === 1) console.time('scanPart');
			if (counter <= concurrency && rampUpConnections) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
			}

			const result = await this.performHeadRequest(
				queueUrl,
				httpAgent,
				httpsAgent
			);

			if (result.isOk()) {
				//exists
				completedTaskCounter++;
				if (completedTaskCounter % 10000 === 0) {
					console.timeEnd('scanPart');
					console.time('scanPart');
					this.logger.info(`scanned ${completedTaskCounter} files`);
				}
				callback();
			} else callback(HttpQueue.parseError(result.error, queueUrl));
		};

		try {
			await eachLimit(urls, concurrency, worker);
			return ok(undefined);
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}

	private async performHeadRequest<Meta extends Record<string, unknown>>(
		queueUrl: QueueUrl<Meta>,
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
			queueUrl.url,
			{
				responseType: undefined,
				timeoutMs: 2000,
				httpAgent: httpAgent,
				httpsAgent: httpsAgent
			}
		);
	}

	async get<Meta extends Record<string, unknown>>( //resulthandler needs cleaner solution
		urls: IterableIterator<QueueUrl<Meta>>,
		resultHandler: (result: Record<string, unknown>) => Error | undefined,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		rampUpConnections = false
	): Promise<Result<void, QueueError<Meta> | Error>> {
		let completedTaskCounter = 0;
		let counter = 0;

		const getWorker = async (
			queueUrl: QueueUrl<Meta>,
			callback: ErrorCallback<QueueError<Meta>>
		) => {
			counter++;
			if (counter === 1) console.time('scanPart');
			if (counter <= concurrency && rampUpConnections) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
			}
			const result = await this.performGetRequest(
				queueUrl,
				httpAgent,
				httpsAgent
			);

			if (result.isOk()) {
				const data = result.value.data;
				//could be handed to a validate function supplied as a parameter to make more generic
				if (isObject(data)) {
					const error = resultHandler(data);
					if (error) callback(new QueueError(queueUrl, error));
					else {
						completedTaskCounter++;
						if (completedTaskCounter % 10000 === 0) {
							console.timeEnd('scanPart');
							console.time('scanPart');
							this.logger.info(`Fetched ${completedTaskCounter} files`);
						}
						callback();
					}
				} else {
					callback(new FileNotFoundError(queueUrl));
				}
			} else HttpQueue.parseError(result.error, queueUrl);
		};

		try {
			await eachLimit(urls, concurrency, getWorker);
			return ok(undefined);
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}

	private async performGetRequest<Meta extends Record<string, unknown>>(
		queueUrl: QueueUrl<Meta>,
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
			queueUrl.url,
			{
				responseType: 'json',
				timeoutMs: 2000,
				httpAgent: httpAgent,
				httpsAgent: httpsAgent
			}
		);
	}

	private static parseError<Meta extends Record<string, unknown>>(
		error: HttpError,
		queueUrl: QueueUrl<Meta>
	): QueueError<Meta> {
		if (
			error.code &&
			['ETIMEDOUT', 'ECONNABORTED', 'TIMEOUT', 'ERR_REQUEST_ABORTED'].includes(
				error.code
			)
		) {
			//return new TimeoutError(error);
			return new QueueError<Meta>(queueUrl, error);
		}

		if (error.response?.status === 429) {
			//return new RateLimitError(error);
			return new QueueError<Meta>(queueUrl, error);
		}

		if (error.response?.status === 404) {
			return new FileNotFoundError<Meta>(queueUrl);
		}

		return new QueueError<Meta>(queueUrl, error);
	}
}
