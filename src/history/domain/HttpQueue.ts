import { Url } from '../../shared/domain/Url';
import { eachLimit, ErrorCallback } from 'async';
import { inject, injectable } from 'inversify';
import { Logger } from '../../shared/services/PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { CustomError } from '../../shared/errors/CustomError';
import { FetchError, UrlFetcher } from './UrlFetcher';
import { mapUnknownToError } from '../../shared/utilities/mapUnknownToError';
import { asyncSleep } from '../../shared/utilities/asyncSleep';

export class QueueError<
	Meta extends Record<string, unknown>
> extends CustomError {
	constructor(public fetchUrl: QueueUrl<Meta>, cause: FetchError) {
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

export interface FetchResult<Meta extends Record<string, unknown>> {
	fetchUrl: QueueUrl<Meta>;
	data: Record<string, unknown>;
}

@injectable()
export class HttpQueue {
	constructor(
		private urlFetcher: UrlFetcher,
		@inject('Logger') private logger: Logger
	) {}

	async exists<Meta extends Record<string, unknown>>(
		urls: IterableIterator<QueueUrl<Meta>>,
		concurrency: number
	) {
		let completedTaskCounter = 0;
		let counter = 0;

		const worker = async (
			queueUrl: QueueUrl<Meta>,
			callback: ErrorCallback<Error>
		) => {
			counter++;
			if (counter === 1) console.time('scanPart');
			if (counter <= concurrency) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
			}

			const result = await this.urlFetcher.exists(queueUrl.url);
			if (result.isOk()) {
				if (result.value) {
					//exists
					completedTaskCounter++;
					if (completedTaskCounter % 1000 === 0) {
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

	async fetch<Meta extends Record<string, unknown>>(
		urls: QueueUrl<Meta>[],
		concurrency: number
	): Promise<Result<FetchResult<Meta>[], Error>> {
		const fetchResults: FetchResult<Meta>[] = [];

		let completedTaskCounter = 0;
		let counter = 0;

		const fetchWorker = async (
			fetchUrl: QueueUrl<Meta>,
			callback: ErrorCallback<Error>
		) => {
			counter++;
			if (counter === 1) console.time('scanPart');
			if (counter <= concurrency) {
				//avoid opening up all the tcp connections at the same time
				await asyncSleep((counter - 1) * 20);
			}
			const result = await this.urlFetcher.fetchJSON(fetchUrl.url);

			if (result.isOk()) {
				//could be handed to a validate function supplied as a parameter to make more generic
				if (result.value !== undefined) {
					fetchResults.push({
						fetchUrl: fetchUrl,
						data: result.value
					});

					completedTaskCounter++;
					if (completedTaskCounter % 1000 === 0) {
						console.timeEnd('scanPart');
						console.time('scanPart');
						this.logger.info(
							`Fetched ${completedTaskCounter}/${urls.length} files`
						);
					}

					callback();
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
			return ok(fetchResults);
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}
}
