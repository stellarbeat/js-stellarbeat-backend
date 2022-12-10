import { sortHistoryUrls } from '../sortHistoryUrls';
import { createDummyHistoryBaseUrl } from '../../history-archive/__fixtures__/HistoryBaseUrl';

it('should sort not yet scanned urls in the front', function () {
	const scannedUrl = createDummyHistoryBaseUrl();
	const notYetScannedUrl = createDummyHistoryBaseUrl();

	const scanDates = new Map<string, Date>();
	scanDates.set(scannedUrl.value, new Date());

	const sortedUrls = sortHistoryUrls([scannedUrl, notYetScannedUrl], scanDates);
	expect(sortedUrls[0]).toEqual(notYetScannedUrl);
});

it('should sort older scans in the front', function () {
	const noScan = createDummyHistoryBaseUrl();
	const newScan = createDummyHistoryBaseUrl();
	const newestScan = createDummyHistoryBaseUrl();
	const oldScan = createDummyHistoryBaseUrl();

	const scanDates = new Map<string, Date>();
	scanDates.set(newScan.value, new Date('01-01-2020'));
	scanDates.set(newestScan.value, new Date('01-01-2021'));
	scanDates.set(oldScan.value, new Date('01-01-2019'));

	const sortedUrls = sortHistoryUrls(
		[newScan, newestScan, noScan, oldScan],
		scanDates
	);

	expect(sortedUrls[0]).toEqual(noScan);
	expect(sortedUrls[1]).toEqual(oldScan);
	expect(sortedUrls[2]).toEqual(newScan);
	expect(sortedUrls[3]).toEqual(newestScan);
});
