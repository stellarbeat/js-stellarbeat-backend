import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { HistoryArchiveScanSummaryRepository } from '../../../domain/HistoryArchiveScanSummaryRepository';
import { HistoryArchiveScanSummary } from '../../../domain/HistoryArchiveScanSummary';
import { createDummyHistoryBaseUrl } from '../../../domain/__fixtures__/HistoryBaseUrl';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should find latest scan', async function () {
	const repo: HistoryArchiveScanSummaryRepository = kernel.container.get(
		'HistoryArchiveScanRepository'
	);

	const olderDate = new Date('12/12/2000');
	const latestDate = new Date('12/12/2001');

	await repo.save([
		HistoryArchiveScanSummary.create(
			olderDate,
			new Date(),
			createDummyHistoryBaseUrl(),
			0,
			1000,
			[]
		),
		HistoryArchiveScanSummary.create(
			latestDate,
			new Date(),
			createDummyHistoryBaseUrl(),
			0,
			1000,
			[]
		)
	]);

	const latest = await repo.findLatestByUrl(createDummyHistoryBaseUrl().value);

	expect(latest).toBeInstanceOf(HistoryArchiveScanSummary);
	if (!latest) throw new Error();

	expect(latest.startDate.getTime()).toEqual(latestDate.getTime());
});
