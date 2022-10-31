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
	RequestMethod,
	RetryableQueueError
} from '../HttpQueue';
import { injectable } from 'inversify';
import * as http from 'http';
import * as https from 'https';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';
import * as workerpool from 'workerpool';
import { WorkerPool } from 'workerpool';
import { createGunzip } from 'zlib';
import { createHash } from 'crypto';
import * as stream from 'stream';
import { pipeline } from 'stream/promises';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';

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
			return await this.verify(
				historyArchive,
				concurrency,
				httpAgent,
				httpsAgent
			);
		} else {
			return await this.exists(
				historyArchive,
				concurrency,
				httpAgent,
				httpsAgent
			);
		}
	}

	private async verify(
		historyArchive: HistoryArchive,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	) {
		const verify = async (
			readStream: unknown,
			request: Request<BucketRequestMeta>
		): Promise<Result<void, QueueError<BucketRequestMeta>>> => {
			if (!(readStream instanceof stream.Readable))
				return err(new FileNotFoundError(request));
			const zlib = createGunzip();
			const hasher = createHash('sha256');

			try {
				await pipeline(readStream, zlib, hasher);
				if (hasher.digest('hex') !== request.meta.hash)
					return err(
						new QueueError<BucketRequestMeta>(
							request,
							new Error('wrong bucket hash')
						)
					);
				return ok(undefined);
			} catch (error) {
				return err(
					new RetryableQueueError<BucketRequestMeta>(
						request,
						mapUnknownToError(error)
					)
				);
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
					nrOfRetries: 3,
					rampUpConnections: true,
					httpOptions: {
						httpAgent: httpAgent,
						httpsAgent: httpsAgent,
						responseType: 'stream',
						timeoutMs: 3000 //timeout to start of streaming
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
					nrOfRetries: 3,
					rampUpConnections: true,
					httpOptions: {
						responseType: undefined,
						timeoutMs: 5000,
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
}
