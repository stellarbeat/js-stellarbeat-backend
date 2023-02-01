import { Container, decorate, injectable } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { Network, Node } from '@stellarbeat/js-stellarbeat-shared';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { getRepository } from 'typeorm';
import { UnmuteNotificationDTO } from '../UnmuteNotificationDTO';
import { PublicKey } from '../../../domain/event/EventSourceId';
import { ValidatorXUpdatesNotValidatingEvent } from '../../../domain/event/Event';
import { UnmuteNotification } from '../UnmuteNotification';
import { EventNotificationState } from '../../../domain/subscription/EventNotificationState';
import { createDummyPendingSubscriptionId } from '../../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { UserService } from '../../../../core/services/UserService';
import { mock } from 'jest-mock-extended';
import { ok } from 'neverthrow';
import { NetworkDTOService } from '../../../../network-scan/services/NetworkDTOService';
decorate(injectable(), UserService);
jest.mock('../../../../core/services/UserService');

let container: Container;
let kernel: Kernel;
let SubscriberRepository: SubscriberRepository;
jest.setTimeout(60000); //slow integration tests

let nodeA: Node;
let nodeB: Node;

beforeEach(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	SubscriberRepository = kernel.container.get('SubscriberRepository');

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
	await kernel.close();
});

it('should unmute notification', async function () {
	const networkDTOService = mock<NetworkDTOService>();
	networkDTOService.getNetworkDTOAt.mockResolvedValue(
		ok(new Network([nodeA, nodeB]))
	);
	container.rebind(NetworkDTOService).toConstantValue(networkDTOService);

	const subscriber = createDummySubscriber();
	const publicKeyResult = PublicKey.create(
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (!publicKeyResult.isOk()) return;

	const pendingId = createDummyPendingSubscriptionId();
	subscriber.addPendingSubscription(
		pendingId,
		[publicKeyResult.value],
		new Date()
	);
	subscriber.confirmPendingSubscription(pendingId);

	const event = new ValidatorXUpdatesNotValidatingEvent(
		new Date(),
		publicKeyResult.value,
		{
			numberOfUpdates: 3
		}
	);

	const firstNotification = subscriber.publishNotificationAbout([event]);
	expect(firstNotification?.events).toHaveLength(1);

	const nullNotification = subscriber.publishNotificationAbout([event]);
	expect(nullNotification).toBeNull();

	await SubscriberRepository.save([subscriber]);

	const unmuteNotification = container.get(UnmuteNotification);
	const unmuteDTO: UnmuteNotificationDTO = {
		eventSourceType: 'node',
		eventSourceId: event.sourceId.value,
		eventType: event.type,
		subscriberReference: subscriber.subscriberReference.value
	};

	const result = await unmuteNotification.execute(unmuteDTO);
	expect(result.isOk()).toBeTruthy();
	const eventStateRepo = getRepository(EventNotificationState, 'test');
	const state = await eventStateRepo.findOne(1);
	expect(state?.ignoreCoolOffPeriod).toBeTruthy();
});
