import { CheckPointGenerator } from '../../check-point/CheckPointGenerator';
import { StandardCheckPointFrequency } from '../../check-point/StandardCheckPointFrequency';
import { HASValidator } from '../../history-archive/HASValidator';
import { LoggerMock } from '../../../../shared/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import { FileNotFoundError, HttpQueue, QueueError } from '../../HttpQueue';
import { err, ok, Result } from 'neverthrow';
import * as http from 'http';
import * as https from 'https';
import { HASFilesScanner } from '../HASFilesScanner';
import { ExceptionLoggerMock } from '../../../../shared/services/__mocks__/ExceptionLoggerMock';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { GapFoundError } from '../GapFoundError';
import { ScanError } from '../HistoryArchiveScanner';

describe('tests', () => {
	it('should extract bucket hashes', async function () {
		const httpQueue = mock<HttpQueue>();
		httpQueue.get.mockImplementation(
			(
				urls,
				resultHandler,
				concurrency,
				httpAgent: http.Agent,
				httpsAgent: https.Agent,
				rampUp
			): Promise<Result<void, QueueError<any>>> => {
				resultHandler({
					version: 1,
					server:
						'stellar-core 18.3.0 (2f9ce11b2e7eba7d7d38b123ee6da9e0144249f8)',
					currentLedger: 200,
					networkPassphrase: 'Test SDF Network ; September 2015',
					currentBuckets: [
						{
							curr: '3cb6cd408d76ddee1f1c47b6c04184f256449f30130021c33db24a77a534c5eb',
							next: {
								state: 0
							},
							snap: 'ca1b62a33d8ea05710328e4c8e6ee95980cf41d3304474f2af5550b49497420e'
						}
					]
				});
				return new Promise((resolve) => {
					resolve(ok(undefined));
				});
			}
		);

		const bucketHashesOrError = await scanHASFilesAndReturnBucketHashes(
			httpQueue
		);

		expect(bucketHashesOrError.isOk()).toBeTruthy();
		if (bucketHashesOrError.isErr()) throw bucketHashesOrError.error;

		expect(bucketHashesOrError.value).toEqual(
			new Set([
				'3cb6cd408d76ddee1f1c47b6c04184f256449f30130021c33db24a77a534c5eb',
				'ca1b62a33d8ea05710328e4c8e6ee95980cf41d3304474f2af5550b49497420e'
			])
		);
	});

	it('should signal a gap if a HAS file is not found', async function () {
		const httpQueue = mock<HttpQueue>();
		httpQueue.get.mockResolvedValue(
			err(
				new FileNotFoundError({
					url: createDummyHistoryBaseUrl(),
					meta: { checkPoint: 100 }
				})
			)
		);

		const bucketHashesOrError = await scanHASFilesAndReturnBucketHashes(
			httpQueue
		);
		expect(bucketHashesOrError.isOk()).toBeFalsy();
		if (bucketHashesOrError.isOk()) throw new Error();

		expect(bucketHashesOrError.error).toBeInstanceOf(GapFoundError);
		expect(bucketHashesOrError.error.checkPoint).toEqual(100);
	});

	it('should signal a ScanError occurred if there was a non 404 error when fetching a HAS file', async function () {
		const httpQueue = mock<HttpQueue>();
		httpQueue.get.mockResolvedValue(
			err(
				new QueueError({
					url: createDummyHistoryBaseUrl(),
					meta: { checkPoint: 100 }
				})
			)
		);

		const bucketHashesOrError = await scanHASFilesAndReturnBucketHashes(
			httpQueue
		);
		expect(bucketHashesOrError.isOk()).toBeFalsy();
		if (bucketHashesOrError.isOk()) throw new Error();

		expect(bucketHashesOrError.error).toBeInstanceOf(ScanError);
		expect(bucketHashesOrError.error.checkPoint).toEqual(100);
	});
});
async function scanHASFilesAndReturnBucketHashes(httpQueue: HttpQueue) {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);
	const hasValidator = new HASValidator(new LoggerMock());
	const HASFileScanner = new HASFilesScanner(
		hasValidator,
		httpQueue,
		new LoggerMock(),
		new ExceptionLoggerMock()
	);

	return await HASFileScanner.scanHASFilesAndReturnBucketHashes(
		createDummyHistoryBaseUrl(),
		checkPointGenerator.generate(0, 100),
		100,
		{} as http.Agent,
		{} as https.Agent
	);
}
