import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { GetMeasurements } from '../GetMeasurements';
import { GetMeasurementsFactory } from '../GetMeasurementsFactory';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should find class instance', async () => {
	const instance = kernel.container.get(GetMeasurements);
	const factory = kernel.container.get(GetMeasurementsFactory);
	expect(instance).toBeDefined();
	expect(factory).toBeDefined();
});
