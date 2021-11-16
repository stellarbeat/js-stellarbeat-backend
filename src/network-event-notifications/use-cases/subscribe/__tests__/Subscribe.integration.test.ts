import { Container } from 'inversify';
import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { Connection } from 'typeorm';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { NetworkWriteRepository } from '../../../../network/repositories/NetworkWriteRepository';
import NetworkUpdate from '../../../../network/domain/NetworkUpdate';
import { EventSourceIdDTO, SubscribeDTO } from '../SubscribeDTO';
import { Subscribe } from '../Subscribe';
import { EventSourceIdFactory } from '../../../domain/event/EventSourceIdFactory';
import { IUserService } from '../../../../shared/domain/IUserService';
import { ok } from 'neverthrow';
import { Subscriber } from '../../../domain/subscription/Subscriber';
import { PendingSubscription } from '../../../domain/subscription/PendingSubscription';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';

let container: Container;
const kernel = new Kernel();
let subscribe: Subscribe;
let networkWriteRepository: NetworkWriteRepository;
jest.setTimeout(60000); //slow integration tests

let nodeA: Node;
let nodeB: Node;

beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	networkWriteRepository = kernel.container.get(NetworkWriteRepository);

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
});

afterEach(async () => {
	await container.get(Connection).close();
});

it('should create new subscriber and create a pending subscription for a known node', async function () {
	const updateTime = new Date();
	await networkWriteRepository.save(
		new NetworkUpdate(updateTime),
		new Network([nodeA, nodeB])
	);

	const eventSourceIdDTO: EventSourceIdDTO = {
		type: 'node',
		id: 'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
	};
	const subscribeDTO = new SubscribeDTO(
		'home@sb.com',
		[eventSourceIdDTO],
		updateTime
	);

	const userService = container.get<IUserService>('UserService');
	const SubscriberRepository = container.get<SubscriberRepository>(
		'SubscriberRepository'
	);
	const createUserFunction = jest.spyOn(userService, 'findOrCreateUser');
	const userId = createDummySubscriber().userId;
	createUserFunction.mockResolvedValue(ok(userId));
	subscribe = new Subscribe(
		container.get(EventSourceIdFactory),
		SubscriberRepository,
		userService
	);
	const result = await subscribe.execute(subscribeDTO);
	expect(result.isOk()).toBeTruthy();
	if (result.isErr()) {
		console.log(result.error);
		return;
	}
	expect(result.value.failed).toHaveLength(0);
	expect(result.value.subscribed).toEqual([eventSourceIdDTO]);
	expect(createUserFunction).toBeCalledTimes(1);

	const subscriber = await SubscriberRepository.findOneByUserId(userId);
	expect(subscriber).toBeInstanceOf(Subscriber);
	expect(subscriber?.pendingSubscription).toBeInstanceOf(PendingSubscription);
	expect(subscriber?.pendingSubscription?.eventSourceIds).toHaveLength(1);
	expect(subscriber?.pendingSubscription?.eventSourceIds[0].value).toEqual(
		'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
	);
});
