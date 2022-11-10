import { err, ok, Result } from 'neverthrow';
import { HistoryArchive } from '../history-archive/HistoryArchive';
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
import { createGunzip } from 'zlib';
import { createHash } from 'crypto';
import * as stream from 'stream';
import { pipeline } from 'stream/promises';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { ScanError } from './ScanError';

@injectable()
export class BucketScanner {
	constructor(private httpQueue: HttpQueue) {}

	async scan(
		historyArchive: HistoryArchive,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		verify = false
	): Promise<Result<void, ScanError>> {
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
		): Promise<Result<void, QueueError>> => {
			if (!(readStream instanceof stream.Readable))
				return err(new FileNotFoundError(request));
			const zlib = createGunzip();
			const hasher = createHash('sha256');

			try {
				await pipeline(readStream, zlib, hasher);
				if (hasher.digest('hex') !== request.meta?.hash)
					return err(new QueueError(request, new Error('wrong bucket hash')));
				return ok(undefined);
			} catch (error) {
				console.log('pipeline error', request.url.value);
				return err(new RetryableQueueError(request, mapUnknownToError(error)));
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
						responseType: 'stream',
						socketTimeoutMs: 60000,
						connectionTimeoutMs: 10000
					}
				},
				verify
			);

		if (verifyBucketsResult.isErr()) {
			return err(mapHttpQueueErrorToScanError(verifyBucketsResult.error));
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
						socketTimeoutMs: 5000,
						connectionTimeoutMs: 5000,
						httpAgent: httpAgent,
						httpsAgent: httpsAgent
					}
				}
			);

		if (bucketsExistResult.isErr()) {
			return err(mapHttpQueueErrorToScanError(bucketsExistResult.error));
		}

		return ok(undefined);
	}
}
