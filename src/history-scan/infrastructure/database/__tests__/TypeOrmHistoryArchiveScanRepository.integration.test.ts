import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { createDummyHistoryBaseUrl } from '../../../domain/__fixtures__/HistoryBaseUrl';
import { TYPES } from '../../di/di-types';
import { ScanRepository } from '../../../domain/history-archive-scan/ScanRepository';
import { Scan } from '../../../domain/history-archive-scan/Scan';
import {
	ScanError,
	ScanErrorType
} from '../../../domain/history-archive-scan/ScanError';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should find the latest scans', async function () {
	const repo: ScanRepository = kernel.container.get(
		TYPES.HistoryArchiveScanRepository
	);

	const url = createDummyHistoryBaseUrl();
	const scan = new Scan(new Date('12/12/2000'), 0, 10, url);
	const scan2 = new Scan(new Date('12/12/2001'), 0, 10, url);

	const scanWithErrorUrl = createDummyHistoryBaseUrl();
	const scanWithError = new Scan(
		new Date('12/12/2001'),
		0,
		10,
		scanWithErrorUrl
	);
	scanWithError.finish(
		new Date('12/13/2001'),
		new ScanError(
			ScanErrorType.TYPE_VERIFICATION,
			scanWithErrorUrl.value,
			'info'
		)
	);

	await repo.save([scan, scan2, scanWithError]);

	const latest = await repo.findLatest();

	expect(latest.length).toEqual(2);
	expect(
		latest.find((scan) => scan.baseUrl.value === url.value)?.startDate.getTime()
	).toEqual(new Date('12/12/2001').getTime());

	const foundErrorScan = latest.find(
		(scan) => scan.baseUrl.value === scanWithErrorUrl.value
	);
	expect(foundErrorScan?.errorType).toEqual(ScanErrorType.TYPE_VERIFICATION);
	expect(foundErrorScan?.errorUrl).toEqual(scanWithErrorUrl.value);
	expect(foundErrorScan?.errorMessage).toEqual('info');

	const latestByUrl = await repo.findLatestByUrl(url.value);
	expect(latestByUrl).toBeDefined();
});
