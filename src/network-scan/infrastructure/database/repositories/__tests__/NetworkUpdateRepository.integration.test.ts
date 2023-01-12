import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { TypeOrmNetworkUpdateRepository } from '../TypeOrmNetworkUpdateRepository';
import NetworkUpdate from '../../../../domain/network/scan/NetworkUpdate';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let networkUpdateRepository: TypeOrmNetworkUpdateRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		networkUpdateRepository = container.get<TypeOrmNetworkUpdateRepository>(
			NETWORK_TYPES.NetworkUpdateRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	it('should store latestLedger correctly', async function () {
		const networkUpdate = new NetworkUpdate(new Date(), []);
		networkUpdate.latestLedger = BigInt(100);

		await networkUpdateRepository.save(networkUpdate);

		const fetchedNetworkUpdate = await networkUpdateRepository.findOne(1);
		expect(fetchedNetworkUpdate).toBeDefined();
		if (!fetchedNetworkUpdate) return;
		expect(fetchedNetworkUpdate.latestLedger).toEqual(
			networkUpdate.latestLedger
		);
		expect(typeof fetchedNetworkUpdate.latestLedger).toEqual('bigint');
		expect(fetchedNetworkUpdate.latestLedgerCloseTime.getTime()).toEqual(
			new Date(0).getTime()
		);
	});
});
