import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { VersionedNetwork } from '../../../../domain/VersionedNetwork';
import { NetworkConfiguration } from '../../../../domain/NetworkConfiguration';
import { NetworkId } from '../../../../domain/NetworkId';
import { VersionedNetworkRepository } from '../../../../domain/VersionedNetworkRepository';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: VersionedNetworkRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get<VersionedNetworkRepository>(
			NETWORK_TYPES.VersionedNetworkRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('save and findByNetworkId', async () => {
		const networkId = new NetworkId('test');
		const network = VersionedNetwork.create(
			networkId,
			new NetworkConfiguration(1, 1, 1, 'go')
		);
		network.updateConfiguration(new NetworkConfiguration(2, 2, 2, 'gogo'));
		const result = await repo.save([network]);
		expect(result).toHaveLength(1);
		expect(result[0].changes).toHaveLength(1);

		const retrieved = await repo.findOneByNetworkId(new NetworkId('test'));
		expect(retrieved).toBeInstanceOf(VersionedNetwork);
		expect(retrieved?.changes).toHaveLength(1);
		expect(retrieved?.networkId.value).toEqual('test');
	});
});
