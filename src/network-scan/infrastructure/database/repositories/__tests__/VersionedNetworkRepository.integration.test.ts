import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { Network } from '../../../../domain/network/Network';
import { NetworkId } from '../../../../domain/network/NetworkId';
import { NetworkRepository } from '../../../../domain/network/NetworkRepository';
import { QuorumSet } from '../../../../domain/QuorumSet';
import PublicKey from '../../../../domain/PublicKey';
import { createDummyNetworkProps } from '../../../../domain/network/__fixtures__/createDummyNetworkProps';
import { NetworkChange } from '../../../../domain/network/change/NetworkChange';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: NetworkRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get<NetworkRepository>(
			NETWORK_TYPES.VersionedNetworkRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('save and findByNetworkId', async () => {
		const networkId = new NetworkId('test');
		const passphrase = 'passphrase';
		const props = createDummyNetworkProps();
		const date = new Date();
		const network = Network.create(date, networkId, passphrase, props);

		const newDate = new Date();
		network.updateName('new name', newDate);
		await repo.save(network);

		const retrieved = await repo.findOneByNetworkId(new NetworkId('test'));

		expect(retrieved).toBeInstanceOf(Network);
		expect(retrieved?.passphrase).toEqual(passphrase);
		expect(retrieved?.quorumSetConfiguration).toBeInstanceOf(QuorumSet);
		expect(retrieved?.quorumSetConfiguration.innerQuorumSets).toHaveLength(1);
		expect(retrieved?.quorumSetConfiguration.innerQuorumSets[0]).toBeInstanceOf(
			QuorumSet
		);
		expect(retrieved?.quorumSetConfiguration.validators).toHaveLength(2);
		expect(retrieved?.quorumSetConfiguration.validators[0]).toBeInstanceOf(
			PublicKey
		);
		expect(
			retrieved?.quorumSetConfiguration.validators[0].equals(
				props.quorumSetConfiguration.validators[0]
			)
		).toBeTruthy();
		expect(retrieved?.snapshotStartDate).toEqual(newDate);
		expect(retrieved?.changes).toHaveLength(1);
		expect(retrieved?.changes[0]).toBeInstanceOf(NetworkChange);
		expect(retrieved?.changes[0].from).toEqual({
			value: props.name
		});
		expect(retrieved?.changes[0].to).toEqual({
			value: 'new name'
		});
		expect(retrieved?.networkId.value).toEqual('test');
	});
});
