import { Container } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import { NetworkWriteRepository } from '../NetworkWriteRepository';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import {
	Network,
	NetworkReadRepository,
	Node
} from '@stellarbeat/js-stellar-domain';
import NetworkUpdate from '../../../domain/NetworkUpdate';
import { CORE_TYPES } from '../../../../core/infrastructure/di/di-types';
import { createDummyPublicKeyString } from '../../../domain/__fixtures__/createDummyPublicKey';

let container: Container;
let kernel: Kernel;
let networkReadRepository: NetworkReadRepository;
let networkWriteRepository: NetworkWriteRepository;
jest.setTimeout(60000); //slow integration tests

beforeEach(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	networkWriteRepository = kernel.container.get(NetworkWriteRepository);
	networkReadRepository = container.get<NetworkReadRepository>(
		CORE_TYPES.NetworkReadRepository
	);
});

afterEach(async () => {
	await kernel.close();
});

it('should find the current network but not the previous network when only one network update is available', async function () {
	const updateTime = new Date();
	const publicKey = createDummyPublicKeyString();
	const node = new Node(publicKey);
	node.active = true;

	await networkWriteRepository.save(
		new NetworkUpdate(updateTime),
		new Network([node])
	);

	const networkResult = await networkReadRepository.getNetwork(updateTime);
	expect(networkResult.isOk()).toBeTruthy();
	if (networkResult.isErr()) return;
	expect(networkResult.value).toBeInstanceOf(Network);
	expect(
		networkResult.value?.getNodeByPublicKey(publicKey).unknown
	).toBeFalsy();

	const previousNetworkResult = await networkReadRepository.getPreviousNetwork(
		updateTime
	);
	expect(previousNetworkResult.isOk()).toBeTruthy();
	if (previousNetworkResult.isErr()) return;
	expect(previousNetworkResult.value).toBeNull();
});

it('should find the previous network', async function () {
	const updateTime = new Date();
	const publicKey = createDummyPublicKeyString();
	const node = new Node(publicKey);
	node.active = true;

	await networkWriteRepository.save(
		new NetworkUpdate(updateTime),
		new Network([node])
	);

	const secondUpdateTime = new Date();
	await networkWriteRepository.save(
		new NetworkUpdate(secondUpdateTime),
		new Network([node])
	);

	const networkResult = await networkReadRepository.getNetwork(
		secondUpdateTime
	);

	expect(networkResult.isOk()).toBeTruthy();
	if (networkResult.isErr()) return;
	expect(networkResult.value).toBeInstanceOf(Network);
	expect(
		networkResult.value?.getNodeByPublicKey(publicKey).unknown
	).toBeFalsy();

	const previousNetworkResult = await networkReadRepository.getPreviousNetwork(
		secondUpdateTime
	);
	expect(previousNetworkResult.isOk()).toBeTruthy();
	if (previousNetworkResult.isErr()) return;
	expect(previousNetworkResult.value).toBeInstanceOf(Network);
	expect(previousNetworkResult.value?.time).toEqual(updateTime);
});
