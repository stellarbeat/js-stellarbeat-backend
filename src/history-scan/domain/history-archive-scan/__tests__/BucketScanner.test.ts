import * as fs from 'fs';
import * as path from 'path';
import { mock } from 'jest-mock-extended';
import { HttpQueue, QueueError, RequestMethod } from '../../HttpQueue';
import { Result } from 'neverthrow';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { BucketScanner } from '../BucketScanner';
import { BucketScanState } from '../ScanState';
import * as http from 'http';
import * as https from 'https';

it('should verify the bucket hash', async function () {
	const bucketPath = path.join(__dirname, '../__fixtures__/bucket.xdr.gz');

	const stream = await fs.createReadStream(bucketPath);
	const httpQueue = mock<HttpQueue>();
	httpQueue.sendRequests.mockImplementation(
		async (urls, options, resultHandler): Promise<Result<void, QueueError>> => {
			if (!resultHandler) throw new Error('No result handler');
			const result = await resultHandler(stream, {
				url: createDummyHistoryBaseUrl(),
				meta: {
					hash: 'fed2affac90580353d1d7845194ecedea42363219c27e0e0788d48b6c739962a'
				},
				method: RequestMethod.GET
			});
			return new Promise((resolve) => resolve(result));
		}
	);

	const scanner = new BucketScanner(httpQueue);

	const result = await scan(
		{
			baseUrl: createDummyHistoryBaseUrl(),
			concurrency: 1,
			httpAgent: {} as http.Agent,
			httpsAgent: {} as https.Agent,
			bucketHashesToScan: new Set([
				'fed2affac90580353d1d7845194ecedea42363219c27e0e0788d48b6c739962a'
			])
		},
		scanner
	);
	expect(result.isOk()).toBeTruthy();
});

const scan = async (scanState: BucketScanState, scanner: BucketScanner) => {
	return await scanner.scan(scanState, true);
};
