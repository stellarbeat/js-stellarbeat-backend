import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { ScanGaps } from '../ScanGaps';
import { MockHistoryArchive } from '../../../infrastructure/http/MockHistoryArchive';

let kernel: Kernel;
const mockHistoryArchive: MockHistoryArchive = new MockHistoryArchive();

jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	await mockHistoryArchive.listen(80);
});

afterAll(async () => {
	await mockHistoryArchive.stop();
	await kernel.close();
});

it('should scan for gaps', async function () {
	const scanGaps = kernel.container.get(ScanGaps);

	const result = await scanGaps.execute({
		date: new Date(),
		toLedger: 1000,
		fromLedger: 0,
		concurrency: 50,
		historyUrl: 'http://127.0.0.1'
	});
	expect(result.isOk()).toBeTruthy();
});
