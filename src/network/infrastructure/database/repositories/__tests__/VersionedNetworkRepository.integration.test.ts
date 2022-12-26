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
		const date = new Date();
		const network = VersionedNetwork.create(
			date,
			networkId,
			'test',
			new NetworkConfiguration(1, 1, 1, 'go')
		);
		const newDate = new Date();
		const snapshot = network.createSnapshotWorkingCopy(newDate);
		snapshot.configuration = new NetworkConfiguration(2, 2, 2, 'gogo');
		network.addSnapshot(snapshot);
		const result = await repo.save([network]);
		expect(result).toHaveLength(1);
		//expect(result[0].changes).toHaveLength(1);

		const retrieved = await repo.findOneByNetworkId(new NetworkId('test'));
		expect(retrieved).toBeInstanceOf(VersionedNetwork);
		expect(retrieved?.snapshotStartDate).toEqual(newDate);
		/*expect(retrieved?.changes).toHaveLength(1);
		expect(retrieved?.changes[0]).toBeInstanceOf(NetworkConfigurationChange);
		expect(retrieved?.changes[0].from).toEqual({
			ledgerVersion: 1,
			overlayMinVersion: 1,
			overlayVersion: 1,
			versionString: 'go'
		});
		expect(retrieved?.changes[0].to).toEqual({
			ledgerVersion: 2,
			overlayMinVersion: 2,
			overlayVersion: 2,
			versionString: 'gogo'
		});*/
		expect(retrieved?.networkId.value).toEqual('test');
	});
});
