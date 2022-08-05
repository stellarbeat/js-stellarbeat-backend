import { err, ok, Result } from 'neverthrow';
import { ScanError } from './HistoryArchiveScanner';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import { GapFoundError } from './GapFoundError';
import { BucketRequestMeta, RequestGenerator } from './RequestGenerator';
import { HttpQueue } from '../HttpQueue';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import * as http from 'http';
import * as https from 'https';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';

@injectable()
export class BucketScanner {
	constructor(
		private httpQueue: HttpQueue,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async scan(
		historyArchive: HistoryArchive,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
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
}
