import { Container, decorate, injectable } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { NodeV1 } from '@stellarbeat/js-stellarbeat-shared';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
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
import { createDummyNodeV1 } from '../../../../network-scan/services/__fixtures__/createDummyNodeV1';
import { createDummyNetworkV1 } from '../../../../network-scan/services/__fixtures__/createDummyNetworkV1';
import { DataSource } from 'typeorm';
decorate(injectable(), UserService);
jest.mock('../../../../core/services/UserService');

let container: Container;
let kernel: Kernel;
let SubscriberRepository: SubscriberRepository;
jest.setTimeout(60000); //slow integration tests

let nodeA: NodeV1;
let nodeB: NodeV1;

beforeEach(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	SubscriberRepository = kernel.container.get('SubscriberRepository');

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
});

afterEach(async () => {
	await kernel.close();
});

it('should unmute notification', async function () {
	const networkDTOService = mock<NetworkDTOService>();
	networkDTOService.getNetworkDTOAt.mockResolvedValue(
		ok(createDummyNetworkV1([nodeA, nodeB]))
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
	const eventStateRepo = container
		.get(DataSource)
		.getRepository(EventNotificationState);
	const state = await eventStateRepo.findOneById(1);
	expect(state?.ignoreCoolOffPeriod).toBeTruthy();
});
