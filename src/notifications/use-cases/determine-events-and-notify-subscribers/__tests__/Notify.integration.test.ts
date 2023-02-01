import { Container } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { getRepository } from 'typeorm';
import { Notify } from '../Notify';
import { NotifyDTO } from '../NotifyDTO';
import { NoNetworkError, NoPreviousNetworkError } from '../NotifyError';
import { Network, Node } from '@stellarbeat/js-stellarbeat-shared';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { NetworkId } from '../../../domain/event/EventSourceId';
import { EventNotificationState } from '../../../domain/subscription/EventNotificationState';
import {
	EventType,
	NetworkLossOfLivenessEvent
} from '../../../domain/event/Event';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { createDummyPendingSubscriptionId } from '../../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';
import { UserService } from '../../../../core/services/UserService';
import { ok } from 'neverthrow';
import { createDummyPublicKeyString } from '../../../../network-scan/domain/node/__fixtures__/createDummyPublicKey';
import { NetworkDTOService } from '../../../../network-scan/services/NetworkDTOService';
import { mock } from 'jest-mock-extended';
import NetworkStatistics from '@stellarbeat/js-stellarbeat-shared/lib/network-statistics';
import { EventDetector } from '../../../domain/event/EventDetector';

let container: Container;
let kernel: Kernel;
let notify: Notify;
let SubscriberRepository: SubscriberRepository;
jest.setTimeout(60000); //slow integration tests

let nodeA: Node;
let nodeB: Node;

beforeEach(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	SubscriberRepository = container.get<SubscriberRepository>(
		'SubscriberRepository'
	);
	notify = container.get(Notify);
	const a = createDummyPublicKeyString();
	const b = createDummyPublicKeyString();
	nodeA = new Node(a);
	nodeA.active = true;
	nodeA.isValidating = true;
	nodeA.quorumSet.threshold = 2;
	nodeA.quorumSet.validators = [a, b];
	nodeB = new Node(b);
	nodeB.active = true;
	nodeB.isValidating = true;
	nodeB.quorumSet.threshold = 2;
	nodeB.quorumSet.validators = [a, b];
});

afterEach(async () => {
	await kernel.close();
});

it('should return error if no network is available', async function () {
	const notifyDTO = new NotifyDTO(new Date());
	const result = await notify.execute(notifyDTO);
	expect(result.isErr()).toBeTruthy();
	if (!result.isErr()) return;
	expect(result.error).toBeInstanceOf(NoNetworkError);
});

it('should return error if no previous network is available', async function () {
	const updateTime = new Date();
	const networkService = mock<NetworkDTOService>();
	networkService.getNetworkDTOAt.mockResolvedValue(
		ok(new Network([nodeA, nodeB]))
	);
	networkService.getPreviousNetworkDTO.mockResolvedValue(ok(null));
	container.rebind(NetworkDTOService).toConstantValue(networkService);

	const notifyDTO = new NotifyDTO(updateTime);
	const result = await container.get(Notify).execute(notifyDTO);
	expect(result.isErr()).toBeTruthy();
	if (!result.isErr()) return;
	expect(result.error).toBeInstanceOf(NoPreviousNetworkError);
});

it('should notify when a subscribed event occurs', async function () {
	const latestUpdateTime = new Date();
	const network = new Network(
		[nodeA, nodeB],
		[],
		new Date(),
		null,
		new NetworkStatistics()
	);
	const networkService = mock<NetworkDTOService>();
	networkService.getNetworkDTOAt.mockResolvedValue(ok(network));
	networkService.getPreviousNetworkDTO.mockResolvedValue(ok(network));
	container.rebind(NetworkDTOService).toConstantValue(networkService);

	const eventDetector = mock<EventDetector>();
	eventDetector.detect.mockResolvedValue(
		ok([
			new NetworkLossOfLivenessEvent(new Date(), new NetworkId('test'), {
				from: 5,
				to: 1
			})
		])
	);
	container.rebind(EventDetector).toConstantValue(eventDetector);

	const subscriber = createDummySubscriber();
	const pendingId = createDummyPendingSubscriptionId();
	subscriber.addPendingSubscription(
		pendingId,
		[new NetworkId(kernel.config.networkConfig.networkId)],
		new Date()
	);
	subscriber.confirmPendingSubscription(pendingId);
	await SubscriberRepository.save([subscriber]);

	const notifyDTO = new NotifyDTO(latestUpdateTime);

	const userService = mock<UserService>();
	userService.send.mockResolvedValue(ok(undefined));
	container.rebind('UserService').toConstantValue(userService);

	const result = await container.get(Notify).execute(notifyDTO);
	expect(result.isOk()).toBeTruthy();
	expect(userService.send).toBeCalled();

	const eventStateRepo = getRepository(EventNotificationState, 'test');
	const state = await eventStateRepo.find();
	expect(state[0].eventType).toEqual(EventType.NetworkLossOfLiveness);
});
