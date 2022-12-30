import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { mock } from 'jest-mock-extended';
import { GetNetworkDayStatistics } from '../GetNetworkDayStatistics';
import { NetworkMeasurementDayRepository } from '../../../domain/measurement-aggregation/NetworkMeasurementDayRepository';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';

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
		.rebind(NETWORK_TYPES.NetworkMeasurementDayRepository)
		.toConstantValue(repo);

	const getNetworkDayStatistics = kernel.container.get(GetNetworkDayStatistics);
	const result = await getNetworkDayStatistics.execute({
		from: new Date(),
		to: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
