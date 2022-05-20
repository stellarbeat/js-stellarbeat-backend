import { HistoryArchiveScan } from '../HistoryArchiveScan';
import { createDummyHistoryBaseUrl } from '../../__fixtures__/HistoryBaseUrl';

it('should lower concurrency', function () {
	const scan = new HistoryArchiveScan(
		new Date(),
		0,
		100,
		createDummyHistoryBaseUrl()
	);
	expect(scan.concurrency).toEqual(400);
	scan.lowerConcurrency();
	expect(scan.concurrency).toEqual(300);
	scan.lowerConcurrency();
	scan.lowerConcurrency();
	scan.lowerConcurrency();
	scan.lowerConcurrency();
	scan.lowerConcurrency();
	scan.lowerConcurrency();
	expect(scan.concurrency).toEqual(0);
	scan.lowerConcurrency();
	expect(scan.concurrency).toEqual(0);
});
