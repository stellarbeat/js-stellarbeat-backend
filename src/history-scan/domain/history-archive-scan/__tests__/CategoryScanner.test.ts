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
import { CategoryScanner } from '../CategoryScanner';
import * as path from 'path';
import * as fs from 'fs';
import { Category } from '../../history-archive/Category';
import { LedgerHeader } from '../Scanner';
import { ScanError } from '../ScanError';

jest.setTimeout(15000);

describe('scan HAS files', () => {
	it('should extract bucket hashes', async function () {
		const httpQueue = mock<HttpQueue>();
		httpQueue.sendRequests.mockImplementation(
			(urls, options, resultHandler): Promise<Result<void, QueueError>> => {
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
		const url = createDummyHistoryBaseUrl();
		httpQueue.sendRequests.mockResolvedValue(
			err(
				new FileNotFoundError({
					url: url,
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

		expect(bucketHashesOrError.error).toBeInstanceOf(ScanError);
		expect(bucketHashesOrError.error.url).toEqual(url.value);
	});
});

it('should verify  other categories', async function () {
	const result = await getOtherCategoriesVerifyResult(false);
	expect(result.isOk()).toBeTruthy();
});

it('should verify empty archives', async function () {
	const emptyFilesResult = await getOtherCategoriesVerifyResult(true);
	expect(emptyFilesResult.isOk()).toBeTruthy();
});

it('should not verify wrong previous ledger headers', async function () {
	const result = await getOtherCategoriesVerifyResult(false, {
		ledger: 556799,
		hash: 'WRONG'
	});
	expect(result.isOk()).toBeFalsy();
});

it('should not verify passed previous ledger headers (from a previous scan)', async function () {
	const result = await getOtherCategoriesVerifyResult(false, {
		ledger: 556799,
		hash: 'ev0m5kh9gybsCHkLBXJKex/KXL072Zl1NV4XTP92mtE='
	});
	expect(result.isOk()).toBeTruthy();
});

async function getOtherCategoriesVerifyResult(
	testEmptyFile: boolean,
	previousLedgerHeader?: LedgerHeader
) {
	const httpQueue = mock<HttpQueue>();
	httpQueue.sendRequests.mockImplementation(
		async (
			requests: IterableIterator<Request<Record<string, unknown>>>,
			options,
			resultHandler
		): Promise<Result<void, QueueError>> => {
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
				const data = await fs.createReadStream(
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
	const categoryScanner = new CategoryScanner(
		hasValidator,
		httpQueue,
		checkPointGenerator
	);

	return await categoryScanner.scanOtherCategories(
		{
			baseUrl: createDummyHistoryBaseUrl(),
			checkPoints: checkPointGenerator.generate(0, 100),
			concurrency: 100,
			httpAgent: {} as http.Agent,
			httpsAgent: {} as https.Agent,
			previousLedgerHeader: previousLedgerHeader
				? previousLedgerHeader
				: undefined
		},
		true
	);
}

async function scanHASFilesAndReturnBucketHashes(httpQueue: HttpQueue) {
	const checkPointGenerator = new CheckPointGenerator(
		new StandardCheckPointFrequency()
	);
	const hasValidator = new HASValidator(new LoggerMock());
	const categoryScanner = new CategoryScanner(
		hasValidator,
		httpQueue,
		checkPointGenerator
	);

	return await categoryScanner.scanHASFilesAndReturnBucketHashes({
		baseUrl: createDummyHistoryBaseUrl(),
		checkPoints: checkPointGenerator.generate(0, 100),
		concurrency: 100,
		httpAgent: {} as http.Agent,
		httpsAgent: {} as https.Agent
	});
}
