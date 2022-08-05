import { err, ok, Result } from 'neverthrow';
import { ScanError } from './HistoryArchiveScanner';
import { HistoryArchive } from '../history-archive/HistoryArchive';
import { GapFoundError } from './GapFoundError';
import { BucketUrlMeta } from '../UrlBuilder';
import { RequestGenerator } from './RequestGenerator';
import { FileNotFoundError, HttpQueue } from '../HttpQueue';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import * as http from 'http';
import * as https from 'https';

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
		const bucketsExistResult = await this.httpQueue.exists<BucketUrlMeta>(
			RequestGenerator.generateBucketRequests(
				historyArchive.bucketHashes,
				historyArchive.baseUrl
			),
			concurrency,
			httpAgent,
			httpsAgent
		);

		if (bucketsExistResult.isErr()) {
			const error = bucketsExistResult.error;
			if (error instanceof FileNotFoundError) {
				return err(new GapFoundError(error.request.url));
			}
			return err(new ScanError(error.request.url, error.cause));
		}

		return ok(undefined);
	}
}
