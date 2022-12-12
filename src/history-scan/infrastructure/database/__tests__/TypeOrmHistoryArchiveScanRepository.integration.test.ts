import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { createDummyHistoryBaseUrl } from '../../../domain/history-archive/__fixtures__/HistoryBaseUrl';
import { TYPES } from '../../di/di-types';
import { ScanRepository } from '../../../domain/scan/ScanRepository';
import { Scan } from '../../../domain/scan/Scan';
import { ScanError, ScanErrorType } from '../../../domain/scan/ScanError';

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
	const scan = new Scan(
		new Date('12/12/2000'),
		new Date('12/12/2000'),
		new Date('12/12/2000'),
		url,
		0,
		200
	);
	const scan2 = new Scan(
		new Date('12/12/2000'),
		new Date('12/12/2001'),
		new Date('12/12/2001'),
		url,
		201,
		400
	);

	const scanWithErrorUrl = createDummyHistoryBaseUrl();
	const scanWithError = new Scan(
		new Date('12/12/2000'),
		new Date('12/12/2001'),
		new Date('12/12/2001'),
		scanWithErrorUrl,
		201,
		400,
		0,
		null,
		0,
		null,
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
	expect(foundErrorScan?.error).toBeInstanceOf(ScanError);
	expect(foundErrorScan?.error?.url).toEqual(scanWithErrorUrl.value);
	expect(foundErrorScan?.error?.message).toEqual('info');

	const latestByUrl = await repo.findLatestByUrl(scanWithErrorUrl.value);
	expect(latestByUrl).toBeDefined();
	expect(latestByUrl?.error).toBeInstanceOf(ScanError);
});
