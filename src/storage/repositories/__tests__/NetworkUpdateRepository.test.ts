import { Container } from 'inversify';
import Kernel from '../../../Kernel';
import { Connection } from 'typeorm';
import { NetworkUpdateRepository } from '../NetworkUpdateRepository';
import NetworkUpdate from '../../entities/NetworkUpdate';
import { ConfigMock } from '../../../__mocks__/configMock';

describe('test queries', () => {
	let container: Container;
	const kernel = new Kernel();
	let networkUpdateRepository: NetworkUpdateRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		await kernel.initializeContainer(new ConfigMock());
		container = kernel.container;
		networkUpdateRepository = container.get(NetworkUpdateRepository);
	});

	afterEach(async () => {
		await container.get(Connection).close();
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
