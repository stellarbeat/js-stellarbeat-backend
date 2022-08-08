import * as fs from 'fs';
import * as path from 'path';
import { mock } from 'jest-mock-extended';
import { HttpQueue, QueueError } from '../../HttpQueue';
import { err, ok, Result } from 'neverthrow';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';
import { BucketScanner } from '../BucketScanner';
import { HistoryArchive } from '../../history-archive/HistoryArchive';
import * as http from 'http';
import * as https from 'https';

it('should verify the bucket hash', async function () {
	const bucketPath = path.join(__dirname, '../__fixtures__/bucket.xdr.gz');

	const data = await fs.promises.readFile(bucketPath);
	const httpQueue = mock<HttpQueue>();
	httpQueue.get.mockImplementation(
		(urls, resultHandler, options): Promise<Result<void, QueueError<any>>> => {
			const error = resultHandler(data, {
				url: createDummyHistoryBaseUrl(),
				meta: {
					hash: 'fed2affac90580353d1d7845194ecedea42363219c27e0e0788d48b6c739962a'
				}
			});
			return new Promise((resolve) => {
				if (error) resolve(err(error));
				else resolve(ok(undefined));
			});
		}
	);

	const scanner = new BucketScanner(httpQueue);
	const historyArchive = new HistoryArchive(createDummyHistoryBaseUrl());
	historyArchive.bucketHashes.add(
		'fed2affac90580353d1d7845194ecedea42363219c27e0e0788d48b6c739962a'
	);

	const result = await scan(historyArchive, scanner);
	expect(result.isOk()).toBeTruthy();
});

const scan = async (historyArchive: HistoryArchive, scanner: BucketScanner) => {
	return await scanner.scan(
		historyArchive,
		1,
		{} as http.Agent,
		{} as https.Agent,
		true
	);
};
