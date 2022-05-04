import { Url } from '../../shared/domain/Url';
import { ErrorCallback, queue } from 'async';
import { inject, injectable } from 'inversify';
import { Logger } from '../../shared/services/PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { CustomError } from '../../shared/errors/CustomError';
import { FetchError, UrlFetcher } from './UrlFetcher';

export class QueueFetchError<
	Meta extends Record<string, unknown>
> extends CustomError {
	constructor(public fetchUrl: FetchUrl<Meta>, cause: FetchError) {
		super('Error when fetching: ' + fetchUrl.url, QueueFetchError.name);
	}
}

export class FileNotFoundError<
	Meta extends Record<string, unknown>
> extends CustomError {
	constructor(public fetchUrl: FetchUrl<Meta>) {
		super('Error when fetching: ' + fetchUrl.url, FileNotFoundError.name);
	}
}

export interface FetchUrl<Meta extends Record<string, unknown>> {
	meta: Meta;
	url: Url;
}

export interface FetchResult<Meta extends Record<string, unknown>> {
	fetchUrl: FetchUrl<Meta>;
	data: Record<string, unknown>;
}

@injectable()
export class HttpQueue {
	constructor(
		private urlFetcher: UrlFetcher,
		@inject('Logger') private logger: Logger
	) {}

	async fetch<Meta extends Record<string, unknown>>(
		urls: FetchUrl<Meta>[],
		concurrency: number
	): Promise<
		Result<FetchResult<Meta>[], QueueFetchError<Meta> | FileNotFoundError<Meta>>
	> {
		console.time('scanPart');
		const results: FetchResult<Meta>[] = [];

		let completedTaskCounter = 0;
		let fetchError: Error | null = null;

		const fetchWorker = async (
			fetchUrl: FetchUrl<Meta>,
			callback: ErrorCallback<Error>
		) => {
			const result = await this.urlFetcher.fetchJSON(fetchUrl.url);

			if (result.isOk()) {
				//could be handed to a validate function supplied as a parameter to make more generic
				if (result.value !== undefined) {
					results.push({
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
				callback(new QueueFetchError(fetchUrl, result.error));
			}
		};

		let actualConcurrency = 1;
		//ramp up concurrency slowly to avoid tcp handshakes overloading server/client. Keepalive ensures we reuse the created connections.
		const concurrencyTimer = setInterval(() => {
			if (actualConcurrency < concurrency) {
				actualConcurrency++;
				q.concurrency = actualConcurrency;
			} else {
				clearInterval(concurrencyTimer);
			}
		}, 100);

		const q = queue(fetchWorker, actualConcurrency);

		q.error((err) => {
			this.logger.info('Error, stopping queue', { msg: err.message });
			fetchError = err;
			q.remove(() => true); //remove all remaining items from queue
		});

		q.drain(function () {
			console.timeEnd('scanPart');
		});

		urls.forEach((url) => {
			q.push(url);
		});

		await q.drain();

		if (fetchError !== null) return err(fetchError);

		return ok(results);
	}
}
