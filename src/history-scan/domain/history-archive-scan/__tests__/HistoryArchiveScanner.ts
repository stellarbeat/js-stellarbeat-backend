import { HistoryArchiveScanner } from '../HistoryArchiveScanner';
import { CheckPointGenerator } from '../../check-point/CheckPointGenerator';
import { StandardCheckPointFrequency } from '../../check-point/StandardCheckPointFrequency';
import { HASValidator } from '../../history-archive/HASValidator';
import { LoggerMock } from '../../../../shared/services/__mocks__/LoggerMock';
import { HttpQueue, QueueError } from '../../HttpQueue';
import { mock } from 'jest-mock-extended';
import { ExceptionLoggerMock } from '../../../../shared/services/__mocks__/ExceptionLoggerMock';
import { HistoryArchiveScan } from '../HistoryArchiveScan';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { ok, Result } from 'neverthrow';
import * as http from 'http';
import * as https from 'https';

it('should scan', async function () {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);
	const hasValidator = new HASValidator(new LoggerMock());

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
	httpQueue.exists.mockResolvedValue(ok(undefined));
	const historyArchiveScanner = new HistoryArchiveScanner(
		checkPointGenerator,
		hasValidator,
		httpQueue,
		new LoggerMock(),
		new ExceptionLoggerMock()
	);

	const historyArchiveScan = new HistoryArchiveScan(
		new Date(),
		0,
		300,
		createDummyHistoryBaseUrl(),
		100
	); //should result in three chunks

	const result = await historyArchiveScanner.perform(historyArchiveScan);
	expect(result.isOk()).toBeTruthy();

	expect(httpQueue.get).toHaveBeenCalledTimes(3); //three chunks
	expect(httpQueue.exists).toHaveBeenCalledTimes(6); //three calls to buckets exist, three calls to other categories exist
});
