import { CheckPointGenerator } from '../../check-point/CheckPointGenerator';
import { StandardCheckPointFrequency } from '../../check-point/StandardCheckPointFrequency';
import { HASValidator } from '../../history-archive/HASValidator';
import { LoggerMock } from '../../../../shared/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import {
	FileNotFoundError,
	HttpQueue,
	QueueError,
	Request,
	RequestMethod
} from '../../HttpQueue';
import { err, ok, Result } from 'neverthrow';
import * as http from 'http';
import * as https from 'https';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { GapFoundError } from '../GapFoundError';
import { CategoryScanner } from '../CategoryScanner';
import { CategoryRequestMeta } from '../RequestGenerator';
import * as path from 'path';
import * as fs from 'fs';
import { Category } from '../../history-archive/Category';

describe('scan HAS files', () => {
	it('should extract bucket hashes', async function () {
		const httpQueue = mock<HttpQueue>();
		httpQueue.sendRequests.mockImplementation(
			(
				urls,
				options,
				resultHandler
			): Promise<Result<void, QueueError<CategoryRequestMeta>>> => {
				if (!resultHandler) throw new Error('No result handler');
				resultHandler(
					{
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
					},
					{
						url: createDummyHistoryBaseUrl(),
						meta: {},
						method: RequestMethod.GET
					}
				);
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

	it('should signal a scan error if an error occurred during http request', async function () {
		const httpQueue = mock<HttpQueue>();
		httpQueue.sendRequests.mockResolvedValue(
			err(
				new FileNotFoundError({
					url: createDummyHistoryBaseUrl(),
					meta: { checkPoint: 100 },
					method: RequestMethod.GET
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
});

it('should verify  other categories', async function () {
	const result = await getOtherCategoriesVerifyResult(false);
	console.log(result);
	expect(result.isOk()).toBeTruthy();

	const emptyFilesResult = await getOtherCategoriesVerifyResult(true);
	expect(emptyFilesResult.isOk()).toBeTruthy();
});

async function getOtherCategoriesVerifyResult(testEmptyFile: boolean) {
	const httpQueue = mock<HttpQueue>();
	httpQueue.sendRequests.mockImplementation(
		async (
			requests: IterableIterator<Request<Record<string, unknown>>>,
			options,
			resultHandler
		): Promise<Result<void, QueueError<Record<string, unknown>>>> => {
			if (!resultHandler) throw new Error('No result handler');

			const getDataPath = (
				testEmptyFile: boolean,
				category: Category
			): string => {
				let fileName = '';
				if (category === Category.results) fileName = 'results';
				else if (category === Category.ledger) fileName = 'ledger';
				else if (category === Category.transactions) fileName = 'transactions';

				if (testEmptyFile) fileName += '_empty';
				fileName += '.xdr.gz';
				return path.join(__dirname, '../__fixtures__/', fileName);
			};

			for await (const request of requests) {
				const data = await fs.promises.readFile(
					getDataPath(testEmptyFile, request.meta.category as Category)
				);
				await resultHandler(data, {
					url: createDummyHistoryBaseUrl(),
					meta: {
						category: request.meta.category
					},
					method: RequestMethod.GET
				});
			}

			return new Promise((resolve) => {
				resolve(ok(undefined));
			});
		}
	);

	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);
	const hasValidator = new HASValidator(new LoggerMock());
	const categoryScanner = new CategoryScanner(hasValidator, httpQueue);

	return await categoryScanner.scanOtherCategories(
		createDummyHistoryBaseUrl(),
		100,
		checkPointGenerator.generate(0, 100),
		{} as http.Agent,
		{} as https.Agent,
		true,
		{
			ledger: 556799,
			hash: 'ev0m5kh9gybsCHkLBXJKex/KXL072Zl1NV4XTP92mtE='
		}
	);
}
async function scanHASFilesAndReturnBucketHashes(httpQueue: HttpQueue) {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);
	const hasValidator = new HASValidator(new LoggerMock());
	const categoryScanner = new CategoryScanner(hasValidator, httpQueue);

	return await categoryScanner.scanHASFilesAndReturnBucketHashes(
		createDummyHistoryBaseUrl(),
		checkPointGenerator.generate(0, 100),
		100,
		{} as http.Agent,
		{} as https.Agent
	);
}
