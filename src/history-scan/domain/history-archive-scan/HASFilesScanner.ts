import { err, ok, Result } from 'neverthrow';
import { UrlGenerator } from '../UrlGenerator';
import { FileNotFoundError, HttpQueue } from '../HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../shared/services/PinoLogger';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { Url } from '../../../shared/domain/Url';
import { ScanError } from './HistoryArchiveScanner';
import { GapFoundError } from './GapFoundError';
import { HASBucketHashExtractor } from '../history-archive/HASBucketHashExtractor';
import * as http from 'http';
import * as https from 'https';

@injectable()
export class HASFilesScanner {
	constructor(
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	//fetches all HAS files in checkpoint range and returns all detected bucket urls
	//todo: check memory impact of returning HASfiles instead and extracting bucket hashes later, would make for cleaner code.
	public async scanHASFilesAndReturnBucketHashes(
		historyBaseUrl: Url,
		checkPoints: IterableIterator<number>,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<Set<string>, GapFoundError | ScanError>> {
		console.time('HAS');
		this.logger.info('Fetching history archive state (HAS) files');
		const historyArchiveStateURLGenerator = UrlGenerator.generateHASFetchUrls(
			historyBaseUrl,
			checkPoints
		);

		const bucketHashes = new Set<string>();
		const successOrError = await this.httpQueue.get(
			historyArchiveStateURLGenerator,
			(result: Record<string, unknown>) => {
				const validateHASResult = this.hasValidator.validate(result);
				if (validateHASResult.isOk()) {
					HASBucketHashExtractor.getNonZeroHashes(
						validateHASResult.value
					).forEach((hash) => bucketHashes.add(hash));
				} else {
					return validateHASResult.error;
				}
			},
			concurrency,
			httpAgent,
			httpsAgent,
			true
		);

		console.timeEnd('HAS');

		if (successOrError.isErr()) {
			const error = successOrError.error;
			if (error instanceof FileNotFoundError) {
				return err(
					new GapFoundError(error.queueUrl.url, error.queueUrl.meta.checkPoint)
				);
			}
			return err(
				new ScanError(
					error.queueUrl.url,
					error.cause,
					error.queueUrl.meta.checkPoint
				)
			);
		}

		return ok(bucketHashes);
	}
}
