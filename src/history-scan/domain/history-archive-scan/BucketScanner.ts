import { err, ok, Result } from 'neverthrow';
import { ScanError } from './HistoryArchiveScanner';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import { GapFoundError } from './GapFoundError';
import { BucketRequestMeta, RequestGenerator } from './RequestGenerator';
import {
	FileNotFoundError,
	HttpQueue,
	QueueError,
	Request
} from '../HttpQueue';
import { injectable } from 'inversify';
import * as http from 'http';
import * as https from 'https';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';
import { gunzipSync } from 'zlib';
import * as crypto from 'crypto';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';

@injectable()
export class BucketScanner {
	constructor(private httpQueue: HttpQueue) {}

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
		const verify = (
			result: unknown,
			request: Request<BucketRequestMeta>
		): QueueError<BucketRequestMeta> | undefined => {
			if (!(result instanceof Buffer)) return new FileNotFoundError(request);
			try {
				const data = gunzipSync(result); //todo: move to worker
				const hashSum = crypto.createHash('sha256');
				hashSum.update(data);
				const hash = hashSum.digest('hex');
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

		const verifyBucketsResult = await this.httpQueue.get<BucketRequestMeta>(
			RequestGenerator.generateBucketRequests(
				historyArchive.bucketHashes,
				historyArchive.baseUrl
			),
			verify,
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
			}
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
		const bucketsExistResult = await this.httpQueue.exists<BucketRequestMeta>(
			RequestGenerator.generateBucketRequests(
				historyArchive.bucketHashes,
				historyArchive.baseUrl
			),
			concurrency,
			httpAgent,
			httpsAgent
		);

		if (bucketsExistResult.isErr()) {
			return err(
				mapHttpQueueErrorToScanError(bucketsExistResult.error, undefined)
			);
		}

		return ok(undefined);
	}

	private getMessageLengthFromXDRBuffer(buffer: Buffer): number {
		if (buffer.length < 4) return 0;

		const length = buffer.slice(0, 4);
		length[0] &= 0x7f; //clear xdr continuation bit
		return length.readUInt32BE(0);
	}

	private getXDRBuffer(
		buffer: Buffer,
		messageLength: number
	): [Buffer, Buffer] {
		return [
			buffer.slice(4, messageLength + 4),
			buffer.slice(4 + messageLength)
		];
	}
}
