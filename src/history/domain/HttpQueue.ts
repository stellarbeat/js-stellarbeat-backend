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
	constructor(public fetchUrl: QueueUrl<Meta>, cause: HttpError) {
		super('Error when fetching: ' + fetchUrl.url, QueueError.name, cause);
	}
}

export class FileNotFoundError<
	Meta extends Record<string, unknown>
> extends CustomError {
	constructor(public fetchUrl: QueueUrl<Meta>) {
		super('Error when fetching: ' + fetchUrl.url, FileNotFoundError.name);
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
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		rampUpConnections = false
	) {
		let completedTaskCounter = 0;
		let counter = 0;

		const worker = async (
			queueUrl: QueueUrl<Meta>,
			callback: ErrorCallback<Error>
		) => {
			counter++;
			if (counter === 1) console.time('scanPart');
			if (counter <= concurrency && rampUpConnections) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
			}

			const result = await retryHttpRequestIfNeeded(
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
			if (result.isOk()) {
				if (result.value) {
					//exists
					completedTaskCounter++;
					if (completedTaskCounter % 10000 === 0) {
						console.timeEnd('scanPart');
						console.time('scanPart');
						this.logger.info(`scanned ${completedTaskCounter} files`);
					}
					callback();
				} else {
					callback(new FileNotFoundError(queueUrl));
				}
			} else callback(new QueueError(queueUrl, result.error));
		};

		try {
			await eachLimit(urls, concurrency, worker);
			return ok(undefined);
		} catch (error) {
			return err(mapUnknownToError(error));
		}

		//return await this.queueIt(urls, worker, concurrency);
	}

	async fetch<Meta extends Record<string, unknown>>( //resulthandler needs cleaner solution
		urls: IterableIterator<QueueUrl<Meta>>,
		resultHandler: (result: Record<string, unknown>) => Error | undefined,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		rampUpConnections = false
	): Promise<Result<void, Error>> {
		let completedTaskCounter = 0;
		let counter = 0;

		const fetchWorker = async (
			fetchUrl: QueueUrl<Meta>,
			callback: ErrorCallback<Error>
		) => {
			counter++;
			if (counter === 1) console.time('scanPart');
			if (counter <= concurrency && rampUpConnections) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
			}
			const result = await retryHttpRequestIfNeeded(
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
				fetchUrl.url,
				{
					responseType: 'json',
					timeoutMs: 2000,
					httpAgent: httpAgent,
					httpsAgent: httpsAgent
				}
			);

			if (result.isOk()) {
				const data = result.value.data;
				//could be handed to a validate function supplied as a parameter to make more generic
				if (isObject(data)) {
					const error = resultHandler(data);
					if (error) callback(error);
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
					callback(new FileNotFoundError(fetchUrl));
				}
			}
			if (result.isErr()) {
				callback(new QueueError(fetchUrl, result.error));
			}
		};

		try {
			await eachLimit(urls, concurrency, fetchWorker);
			return ok(undefined);
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}
}
