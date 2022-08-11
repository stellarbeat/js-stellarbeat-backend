import { err, ok, Result } from 'neverthrow';
import { ScanError } from './HistoryArchiveScanner';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import { GapFoundError } from './GapFoundError';
import { BucketRequestMeta, RequestGenerator } from './RequestGenerator';
import {
	FileNotFoundError,
	HttpQueue,
	QueueError,
	Request,
	RequestMethod
} from '../HttpQueue';
import { injectable } from 'inversify';
import * as http from 'http';
import * as https from 'https';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import * as workerpool from 'workerpool';
import { WorkerPool } from 'workerpool';

@injectable()
export class BucketScanner {
	private pool: WorkerPool;

	constructor(private httpQueue: HttpQueue) {
		try {
			require(__dirname + '/hash-worker.import.js');
			this.pool = workerpool.pool(__dirname + '/hash-worker.import.js');
		} catch (e) {
			this.pool = workerpool.pool(__dirname + '/hash-worker.js');
		}
	}

	async scan(
		historyArchive: HistoryArchive,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		verify = false
	): Promise<Result<void, GapFoundError | ScanError>> {
		if (verify) {
			return this.verify(historyArchive, concurrency, httpAgent, httpsAgent);
		} else {
			return this.exists(historyArchive, concurrency, httpAgent, httpsAgent);
		}
	}

	private async verify(
		historyArchive: HistoryArchive,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	) {
		const verify = async (
			result: unknown,
			request: Request<BucketRequestMeta>
		): Promise<QueueError<BucketRequestMeta> | undefined> => {
			if (!(result instanceof Buffer)) return new FileNotFoundError(request);
			try {
				const hash = await this.unzipAndHash(result);
				if (hash !== request.meta.hash) {
					return new QueueError<BucketRequestMeta>(
						request,
						new Error('wrong bucket hash')
					);
				}
			} catch (e: unknown) {
				return new QueueError<BucketRequestMeta>(request, mapUnknownToError(e));
			}
		};

		const verifyBucketsResult =
			await this.httpQueue.sendRequests<BucketRequestMeta>(
				RequestGenerator.generateBucketRequests(
					historyArchive.bucketHashes,
					historyArchive.baseUrl,
					RequestMethod.GET
				),
				{
					stallTimeMs: 150,
					concurrency: concurrency,
					nrOfRetries: 5,
					rampUpConnections: true,
					httpOptions: {
						httpAgent: httpAgent,
						httpsAgent: httpsAgent,
						responseType: 'arraybuffer',
						timeoutMs: 10000
					}
				},
				verify
			);

		if (verifyBucketsResult.isErr()) {
			return err(
				mapHttpQueueErrorToScanError(verifyBucketsResult.error, undefined)
			);
		}

		return ok(undefined);
	}

	private async exists(
		historyArchive: HistoryArchive,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	) {
		const bucketsExistResult =
			await this.httpQueue.sendRequests<BucketRequestMeta>(
				RequestGenerator.generateBucketRequests(
					historyArchive.bucketHashes,
					historyArchive.baseUrl,
					RequestMethod.HEAD
				),
				{
					stallTimeMs: 150,
					concurrency: concurrency,
					nrOfRetries: 5,
					rampUpConnections: true,
					httpOptions: {
						responseType: undefined,
						timeoutMs: 10000,
						httpAgent: httpAgent,
						httpsAgent: httpsAgent
					}
				}
			);

		if (bucketsExistResult.isErr()) {
			return err(
				mapHttpQueueErrorToScanError(bucketsExistResult.error, undefined)
			);
		}

		return ok(undefined);
	}

	private async unzipAndHash(data: ArrayBuffer) {
		return new Promise((resolve, reject) => {
			this.pool
				.exec('unzipAndHash', [data])
				.then(function (hash) {
					resolve(hash);
				})
				.catch(function (err) {
					reject(err);
				});
		});
	}
}
