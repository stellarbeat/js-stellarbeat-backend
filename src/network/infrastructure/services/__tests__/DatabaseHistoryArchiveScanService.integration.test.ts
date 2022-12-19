import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { TYPES } from '../../di/di-types';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

test('di', async () => {
	const service = kernel.container.get(TYPES.HistoryArchiveScanService);
	expect(service).toBeDefined();
});
