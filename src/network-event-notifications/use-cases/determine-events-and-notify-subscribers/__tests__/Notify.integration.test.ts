import { Container } from 'inversify';
import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { Connection, getRepository } from 'typeorm';
import { Notify } from '../Notify';
import { NotifyDTO } from '../NotifyDTO';
import { NoNetworkError, NoPreviousNetworkError } from '../NotifyError';
import NetworkReadRepository from '../../../../network/repositories/NetworkReadRepository';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { EventDetector } from '../../../domain/event/EventDetector';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { Notifier } from '../../../domain/notifier/Notifier';
import { Logger } from '../../../../shared/services/PinoLogger';
import { ExceptionLogger } from '../../../../shared/services/ExceptionLogger';
import { NetworkWriteRepository } from '../../../../network/repositories/NetworkWriteRepository';
import NetworkUpdate from '../../../../network/domain/NetworkUpdate';
import { NetworkId } from '../../../domain/event/EventSourceId';
import { EventNotificationState } from '../../../domain/subscription/EventNotificationState';
import { EventType } from '../../../domain/event/Event';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { createDummyPendingSubscriptionId } from '../../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';
import { UserService } from '../../../../shared/services/UserService';
import { ok } from 'neverthrow';
import { MessageCreator } from '../../../services/MessageCreator';

let container: Container;
const kernel = new Kernel();
let notify: Notify;
let networkReadRepository: NetworkReadRepository;
let eventDetector: EventDetector;
let SubscriberRepository: SubscriberRepository;
let notifier: Notifier;
let networkWriteRepository: NetworkWriteRepository;
let logger: Logger;
let exceptionLogger: ExceptionLogger;
jest.setTimeout(60000); //slow integration tests

let nodeA: Node;
let nodeB: Node;

beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	networkWriteRepository = kernel.container.get(NetworkWriteRepository);
	networkReadRepository = container.get(NetworkReadRepository);
	eventDetector = container.get(EventDetector);
	SubscriberRepository = container.get<SubscriberRepository>(
		'SubscriberRepository'
	);
	notifier = container.get(Notifier);
	logger = container.get<Logger>('Logger');
	exceptionLogger = container.get<ExceptionLogger>('ExceptionLogger');
	notify = container.get(Notify);
	nodeA = new Node('A');
	nodeA.active = true;
	nodeA.isValidating = true;
	nodeA.quorumSet.threshold = 2;
	nodeA.quorumSet.validators = ['A', 'B'];
	nodeB = new Node('B');
	nodeB.active = true;
	nodeB.isValidating = true;
	nodeB.quorumSet.threshold = 2;
	nodeB.quorumSet.validators = ['A', 'B'];
});

afterEach(async () => {
	await container.get(Connection).close();
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
		[new NetworkId('public')],
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
		networkReadRepository,
		eventDetector,
		SubscriberRepository,
		new Notifier(userService, container.get(MessageCreator)),
		logger,
		exceptionLogger
	);
	const result = await notify.execute(notifyDTO);
	expect(result.isOk()).toBeTruthy();
	expect(spyInstance).toBeCalled();

	const eventStateRepo = getRepository(EventNotificationState, 'test');
	const state = await eventStateRepo.findOne(1);
	expect(state?.eventType).toEqual(EventType.NetworkLossOfLiveness);
});
