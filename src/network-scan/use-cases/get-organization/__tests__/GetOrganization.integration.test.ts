import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { GetOrganization } from '../GetOrganization';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should find class instance', async () => {
	const instance = kernel.container.get(GetOrganization);
	expect(instance).toBeDefined();
});
