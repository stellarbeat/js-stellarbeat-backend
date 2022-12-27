import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { mock } from 'jest-mock-extended';
import { ok } from 'neverthrow';
import { CORE_TYPES } from '../../../../core/infrastructure/di/di-types';
import { GetNetworkMonthStatistics } from '../GetNetworkMonthStatistics';
import NetworkMeasurementMonth from '../../../domain/NetworkMeasurementMonth';
import { NetworkMeasurementMonthRepository } from '../../../infrastructure/database/repositories/NetworkMeasurementMonthRepository';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should fetch and return the month stats', async () => {
	const repo = mock<NetworkMeasurementMonthRepository>();
	repo.findBetween.mockResolvedValue([]);
	kernel.container
		.rebind(NetworkMeasurementMonthRepository)
		.toConstantValue(repo);

	const getNetworkMonthStatistics = kernel.container.get(
		GetNetworkMonthStatistics
	);
	const result = await getNetworkMonthStatistics.execute({
		from: new Date(),
		to: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
