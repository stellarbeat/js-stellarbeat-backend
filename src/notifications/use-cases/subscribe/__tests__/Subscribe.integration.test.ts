import { decorate, injectable } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { Connection } from 'typeorm';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { NetworkWriteRepository } from '../../../../network-scan/infrastructure/repositories/NetworkWriteRepository';
import NetworkUpdate from '../../../../network-scan/domain/NetworkUpdate';
import { EventSourceIdDTO, SubscribeDTO } from '../SubscribeDTO';
import { Subscribe } from '../Subscribe';
import { ok } from 'neverthrow';
import { Subscriber } from '../../../domain/subscription/Subscriber';
import { PendingSubscription } from '../../../domain/subscription/PendingSubscription';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { UserService } from '../../../../core/services/UserService';
import Mock = jest.Mock;
import { NetworkId } from '../../../domain/event/EventSourceId';
decorate(injectable(), UserService);
jest.mock('../../../../core/services/UserService');

let kernel: Kernel;
let subscribe: Subscribe;
let networkWriteRepository: NetworkWriteRepository;
jest.setTimeout(60000); //slow integration tests

let nodeA: Node;
let nodeB: Node;
const userId = createDummySubscriber().userId;
const findOrCreateUserFn = jest.fn();
const sendFn = jest.fn();
let subscriberRepository: SubscriberRepository;
beforeAll(async () => {
	(UserService as Mock).mockImplementation(() => {
		return {
			findOrCreateUser: findOrCreateUserFn.mockResolvedValue(ok(userId)),
			send: sendFn.mockResolvedValue(ok(undefined))
		};
	});
	kernel = await Kernel.getInstance(new ConfigMock());
	networkWriteRepository = kernel.container.get(NetworkWriteRepository);
	subscriberRepository = kernel.container.get<SubscriberRepository>(
		'SubscriberRepository'
	);
	nodeA = new Node('GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH');
	nodeA.active = true;
	nodeA.isValidating = true;
	nodeA.quorumSet.threshold = 2;
	nodeA.quorumSet.validators = [
		'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK',
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	];
	nodeB = new Node('GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK');
	nodeB.active = true;
	nodeB.isValidating = true;
	nodeB.quorumSet.threshold = 2;
	nodeB.quorumSet.validators = [
		'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK',
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	];

	const updateTime = new Date();
	await networkWriteRepository.save(
		new NetworkUpdate(updateTime),
		new Network([nodeA, nodeB])
	);
});

afterAll(async () => {
	await kernel.container.get(Connection).close();
});

describe('execute', () => {
	beforeEach(() => {
		findOrCreateUserFn.mockReset();
		sendFn.mockReset();
	});
	it('should not create a new subscriber if the user/subscriber is already present', async function () {
		const eventSourceIdDTO: EventSourceIdDTO = {
			type: 'node',
			id: 'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
		};
		const subscribeDTO = new SubscribeDTO(
			'home@sb.com',
			[eventSourceIdDTO],
			new Date()
		);

		subscribe = kernel.container.get(Subscribe);
		await subscribe.execute(subscribeDTO);
		const subscriber = await subscriberRepository.findOneByUserId(userId);
		if (subscriber === null || subscriber.pendingSubscription === null)
			throw new Error('subscriber not persisted correctly');

		const otherEventSourceIdDTO: EventSourceIdDTO = {
			type: 'network',
			id: 'public'
		};
		const otherSubscribeDTO = new SubscribeDTO(
			'home@sb.com',
			[otherEventSourceIdDTO],
			new Date()
		);
		await subscribe.execute(otherSubscribeDTO);

		const subscriberWithOldPendingSubscription =
			await subscriberRepository.findOneByPendingSubscriptionId(
				subscriber.pendingSubscription.pendingSubscriptionId
			);
		expect(subscriberWithOldPendingSubscription).toBeNull();
		const subscriberAgain = await subscriberRepository.findOneByUserId(userId);
		expect(subscriberAgain).toBeInstanceOf(Subscriber);
		expect(subscriberAgain?.pendingSubscription?.eventSourceIds).toEqual([
			new NetworkId('public')
		]);
	});
	it('should create new subscriber and create a pending subscription for a known node', async function () {
		const eventSourceIdDTO: EventSourceIdDTO = {
			type: 'node',
			id: 'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
		};
		const subscribeDTO = new SubscribeDTO(
			'home@sb.com',
			[eventSourceIdDTO],
			new Date()
		);

		subscribe = kernel.container.get(Subscribe);
		const result = await subscribe.execute(subscribeDTO);
		if (result.isErr()) throw result.error;

		expect(result.value.failed).toHaveLength(0);
		expect(result.value.subscribed).toEqual([eventSourceIdDTO]);
		expect(findOrCreateUserFn).toBeCalledTimes(1);
		expect(sendFn).toBeCalledTimes(1);

		const subscriber = await subscriberRepository.findOneByUserId(userId);
		expect(subscriber).toBeInstanceOf(Subscriber);
		expect(subscriber?.pendingSubscription).toBeInstanceOf(PendingSubscription);
		expect(subscriber?.pendingSubscription?.eventSourceIds).toHaveLength(1);
		expect(subscriber?.pendingSubscription?.eventSourceIds[0].value).toEqual(
			'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
		);
	});
});
