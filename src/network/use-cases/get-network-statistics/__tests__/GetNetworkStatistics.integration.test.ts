import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { mock } from 'jest-mock-extended';
import { NetworkMeasurementRepository } from '../../../infrastructure/database/repositories/NetworkMeasurementRepository';
import { GetNetworkStatistics } from '../GetNetworkStatistics';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should fetch and return the stats', async () => {
	const repo = mock<NetworkMeasurementRepository>();
	repo.findBetween.mockResolvedValue([]);
	kernel.container.rebind(NetworkMeasurementRepository).toConstantValue(repo);

	const getNetworkStatistics = kernel.container.get(GetNetworkStatistics);
	const result = await getNetworkStatistics.execute({
		from: new Date(),
		to: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
