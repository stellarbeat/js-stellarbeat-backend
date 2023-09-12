import { decorate, injectable } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { NodeV1 } from '@stellarbeat/js-stellarbeat-shared';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { EventSourceIdDTO, SubscribeDTO } from '../SubscribeDTO';
import { Subscribe } from '../Subscribe';
import { ok } from 'neverthrow';
import { Subscriber } from '../../../domain/subscription/Subscriber';
import { PendingSubscription } from '../../../domain/subscription/PendingSubscription';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { UserService } from '../../../../core/services/UserService';
import Mock = jest.Mock;
import { NetworkId } from '../../../domain/event/EventSourceId';
import { mock } from 'jest-mock-extended';
import { NetworkDTOService } from '../../../../network-scan/services/NetworkDTOService';
import { createDummyNodeV1 } from '../../../../network-scan/services/__fixtures__/createDummyNodeV1';
import { createDummyNetworkV1 } from '../../../../network-scan/services/__fixtures__/createDummyNetworkV1';
import { DataSource } from 'typeorm';
decorate(injectable(), UserService);
jest.mock('../../../../core/services/UserService');

let kernel: Kernel;
let subscribe: Subscribe;
jest.setTimeout(60000); //slow integration tests

let nodeA: NodeV1;
let nodeB: NodeV1;
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
	subscriberRepository = kernel.container.get<SubscriberRepository>(
		'SubscriberRepository'
	);
	nodeA = createDummyNodeV1(
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	);
	nodeA.active = true;
	nodeA.isValidating = true;
	nodeA.quorumSet = {
		threshold: 2,
		validators: [
			'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK',
			'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
		],
		innerQuorumSets: []
	};
	nodeB = createDummyNodeV1(
		'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
	);
	nodeB.active = true;
	nodeB.isValidating = true;
	nodeB.quorumSet = {
		threshold: 2,
		validators: [
			'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK',
			'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
		],
		innerQuorumSets: []
	};

	const networkDTOService = mock<NetworkDTOService>();
	networkDTOService.getNetworkDTOAt.mockResolvedValue(
		ok(createDummyNetworkV1([nodeA, nodeB]))
	);
	kernel.container.rebind(NetworkDTOService).toConstantValue(networkDTOService);
});

afterAll(async () => {
	await kernel.container.get(DataSource).destroy();
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
