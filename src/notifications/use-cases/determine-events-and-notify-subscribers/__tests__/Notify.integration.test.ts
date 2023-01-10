import { Container } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { getRepository } from 'typeorm';
import { Notify } from '../Notify';
import { NotifyDTO } from '../NotifyDTO';
import { NoNetworkError, NoPreviousNetworkError } from '../NotifyError';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { EventDetector } from '../../../domain/event/EventDetector';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { Notifier } from '../../../domain/notifier/Notifier';
import { Logger } from '../../../../core/services/PinoLogger';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { NetworkWriteRepository } from '../../../../network-scan/infrastructure/repositories/NetworkWriteRepository';
import NetworkUpdate from '../../../../network-scan/domain/NetworkUpdate';
import { NetworkId } from '../../../domain/event/EventSourceId';
import { EventNotificationState } from '../../../domain/subscription/EventNotificationState';
import { EventType } from '../../../domain/event/Event';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { createDummyPendingSubscriptionId } from '../../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';
import { UserService } from '../../../../core/services/UserService';
import { ok } from 'neverthrow';
import { TYPES } from '../../../infrastructure/di/di-types';
import { createDummyPublicKeyString } from '../../../../network-scan/domain/__fixtures__/createDummyPublicKey';
import { NetworkService } from '../../../../network-scan/services/NetworkService';

let container: Container;
let kernel: Kernel;
let notify: Notify;
let networkService: NetworkService;
let eventDetector: EventDetector;
let SubscriberRepository: SubscriberRepository;
let networkWriteRepository: NetworkWriteRepository;
let logger: Logger;
let exceptionLogger: ExceptionLogger;
jest.setTimeout(60000); //slow integration tests

let nodeA: Node;
let nodeB: Node;

beforeEach(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	networkWriteRepository = kernel.container.get(NetworkWriteRepository);
	networkService = container.get(NetworkService);
	eventDetector = container.get(EventDetector);
	SubscriberRepository = container.get<SubscriberRepository>(
		'SubscriberRepository'
	);
	logger = container.get<Logger>('Logger');
	exceptionLogger = container.get<ExceptionLogger>('ExceptionLogger');
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

	await networkWriteRepository.save(
		new NetworkUpdate(updateTime),
		new Network([nodeA, nodeB])
	);

	const notifyDTO = new NotifyDTO(updateTime);
	const result = await notify.execute(notifyDTO);
	expect(result.isErr()).toBeTruthy();
	if (!result.isErr()) return;
	expect(result.error).toBeInstanceOf(NoPreviousNetworkError);
});

it('should notify when a subscribed event occurs', async function () {
	await networkWriteRepository.save(
		new NetworkUpdate(new Date()),
		new Network([nodeA, nodeB])
	);
	nodeA.isValidating = false;
	nodeB.isValidating = false;

	const latestUpdateTime = new Date();
	await networkWriteRepository.save(
		new NetworkUpdate(latestUpdateTime),
		new Network([nodeA, nodeB])
	);

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

	const userService = {
		send: jest.fn().mockResolvedValue(ok(undefined))
	} as unknown as UserService;
	const spyInstance = jest.spyOn(userService, 'send');
	notify = new Notify(
		networkService,
		eventDetector,
		SubscriberRepository,
		new Notifier(userService, container.get(TYPES.MessageCreator)),
		logger,
		exceptionLogger
	);
	const result = await notify.execute(notifyDTO);
	expect(result.isOk()).toBeTruthy();
	expect(spyInstance).toBeCalled();

	const eventStateRepo = getRepository(EventNotificationState, 'test');
	const state = await eventStateRepo.find();
	expect(state[0].eventType).toEqual(EventType.NetworkLossOfLiveness);
});
