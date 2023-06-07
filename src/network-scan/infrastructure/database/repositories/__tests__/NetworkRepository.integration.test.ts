import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { Network } from '../../../../domain/network/Network';
import { NetworkId } from '../../../../domain/network/NetworkId';
import { NetworkRepository } from '../../../../domain/network/NetworkRepository';
import { NetworkQuorumSetConfiguration } from '../../../../domain/network/NetworkQuorumSetConfiguration';
import PublicKey from '../../../../domain/node/PublicKey';
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
		repo = container.get<NetworkRepository>(NETWORK_TYPES.NetworkRepository);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('save and findByNetworkId', async () => {
		const networkId = new NetworkId('test');
		const passphrase = 'passphrase';
		const props = createDummyNetworkProps();
		const date = new Date('2020-01-01');
		const network = Network.create(date, networkId, passphrase, props);

		const firstUpdateTime = new Date('2020-01-02');
		network.updateName('new name', firstUpdateTime);
		const secondUpdateTime = new Date('2020-01-03');
		network.updateMaxLedgerVersion(100, secondUpdateTime);
		await repo.save(network);

		const retrieved = await repo.findActiveByNetworkId(new NetworkId('test'));

		expect(retrieved).toBeInstanceOf(Network);
		expect(retrieved?.passphrase).toEqual(passphrase);
		expect(retrieved?.quorumSetConfiguration).toBeInstanceOf(
			NetworkQuorumSetConfiguration
		);
		expect(retrieved?.quorumSetConfiguration.innerQuorumSets).toHaveLength(1);
		expect(retrieved?.quorumSetConfiguration.innerQuorumSets[0]).toBeInstanceOf(
			NetworkQuorumSetConfiguration
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
		expect(retrieved?.snapshotStartDate).toEqual(secondUpdateTime);
		expect(retrieved?.changes).toHaveLength(2);
		expect(retrieved?.changes[1]).toBeInstanceOf(NetworkChange);
		expect(retrieved?.changes[1].from).toEqual({
			value: props.name
		});
		expect(retrieved?.changes[1].to).toEqual({
			value: 'new name'
		});
		expect(retrieved?.networkId.value).toEqual('test');
	});

	test('findByNetworkId when no changes', async () => {
		const networkId = new NetworkId('test');
		const passphrase = 'passphrase';
		const props = createDummyNetworkProps();
		const date = new Date();
		const network = Network.create(date, networkId, passphrase, props);
		await repo.save(network);
		const retrieved = await repo.findActiveByNetworkId(new NetworkId('test'));
		expect(retrieved).toBeInstanceOf(Network);
	});

	test('findAtDateByNetworkId', async () => {
		const networkId = new NetworkId('test');
		const passphrase = 'passphrase';
		const props = createDummyNetworkProps();
		const date = new Date('2020-01-01');
		const network = Network.create(date, networkId, passphrase, props);
		const otherNetwork = Network.create(
			date,
			new NetworkId('other'),
			passphrase,
			props
		);

		await repo.save(network);
		await repo.save(otherNetwork);

		network.updateName('new name', new Date('2020-01-02'));
		await repo.save(network);

		const retrievedNetwork = await repo.findAtDateByNetworkId(
			new NetworkId('test'),
			new Date('2020-01-01')
		);
		expect(retrievedNetwork).toBeInstanceOf(Network);
		expect(retrievedNetwork?.name).toEqual(props.name);

		const retrievedNetwork2 = await repo.findAtDateByNetworkId(
			new NetworkId('test'),
			new Date('2020-01-02')
		);
		expect(retrievedNetwork2).toBeInstanceOf(Network);
		expect(retrievedNetwork2?.name).toEqual('new name');
	});

	test('findPassphraseByNetworkId', async () => {
		const networkId = new NetworkId('test');
		const passphrase = 'passphrase';
		const props = createDummyNetworkProps();
		const date = new Date('2020-01-01');
		const network = Network.create(date, networkId, passphrase, props);
		await repo.save(network);
		const retrieved = await repo.findPassphraseByNetworkId(
			new NetworkId('test')
		);
		expect(retrieved).toEqual(passphrase);
	});

	test('Snapshot hydration', async () => {
		const networkId = new NetworkId('test');
		const passphrase = 'passphrase';
		const props = createDummyNetworkProps();
		const date = new Date('2020-01-01');
		const network = Network.create(date, networkId, passphrase, props);
		network.updateName('new name', new Date('2020-01-02'));
		network.updateName('new name 2', new Date('2020-01-03'));
		await repo.save(network);
		const retrieved = await repo.findActiveByNetworkId(new NetworkId('test'));
		expect(retrieved).toBeInstanceOf(Network);
		if (!retrieved) {
			throw new Error('Network not found');
		}
		await repo.save(retrieved);
	});
});
