import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { mock } from 'jest-mock-extended';
import { NetworkMeasurementDayRepository } from '../../../infrastructure/database/repositories/NetworkMeasurementDayRepository';
import { GetNetworkDayStatistics } from '../GetNetworkDayStatistics';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should fetch and return the day stats', async () => {
	const repo = mock<NetworkMeasurementDayRepository>();
	repo.findBetween.mockResolvedValue([]);
	kernel.container
		.rebind(NetworkMeasurementDayRepository)
		.toConstantValue(repo);

	const getNetworkDayStatistics = kernel.container.get(GetNetworkDayStatistics);
	const result = await getNetworkDayStatistics.execute({
		from: new Date(),
		to: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
