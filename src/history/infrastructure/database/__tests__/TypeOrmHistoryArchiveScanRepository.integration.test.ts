import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { HistoryArchiveScanRepository } from '../../../domain/history-archive-scan/HistoryArchiveScanRepository';
import { HistoryArchiveScan } from '../../../domain/history-archive-scan/HistoryArchiveScan';
import { createDummyHistoryBaseUrl } from '../../../domain/__fixtures__/HistoryBaseUrl';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should find the latest scans', async function () {
	const repo: HistoryArchiveScanRepository = kernel.container.get(
		'HistoryArchiveScanRepository'
	);

	const url = createDummyHistoryBaseUrl();
	const scan = new HistoryArchiveScan(new Date('12/12/2000'), 0, 10, url);
	const scan2 = new HistoryArchiveScan(new Date('12/12/2001'), 0, 10, url);
	await repo.save([scan, scan2]);

	const latest = await repo.findLatest();

	expect(latest.length).toEqual(1);
	expect(latest[0].startDate.getTime()).toEqual(
		new Date('12/12/2001').getTime()
	);
});

/*it('should find latest scan', async function () {
	const repo: HistoryArchiveScanRepository = kernel.container.get(
		'HistoryArchiveScanRepository'
	);

	const olderDate = new Date('12/12/2000');
	const latestDate = new Date('12/12/2001');

	await repo.save([
		HistoryArchiveScan.create(
			olderDate,
			new Date(),
			createDummyHistoryBaseUrl(),
			0,
			1000,
			[]
		),
		HistoryArchiveScan.create(
			latestDate,
			new Date(),
			createDummyHistoryBaseUrl(),
			0,
			1000,
			[]
		)
	]);

	const latest = await repo.findLatestByUrl(createDummyHistoryBaseUrl().value);

	expect(latest).toBeInstanceOf(HistoryArchiveScan);
	if (!latest) throw new Error();

	expect(latest.startDate.getTime()).toEqual(latestDate.getTime());
});*/
