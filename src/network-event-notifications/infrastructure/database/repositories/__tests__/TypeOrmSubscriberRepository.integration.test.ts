import { Container } from 'inversify';
import Kernel from '../../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../../config/__mocks__/configMock';
import { Connection, Repository } from 'typeorm';
import { ValidatorXUpdatesNotValidatingEvent } from '../../../../domain/event/Event';
import { Subscriber } from '../../../../domain/subscription/Subscriber';
import { SubscriberRepository } from '../../../../domain/subscription/SubscriberRepository';
import { NetworkId, PublicKey } from '../../../../domain/event/EventSourceId';
import { createDummySubscriber } from '../../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { createDummyPendingSubscriptionId } from '../../../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';

describe('Subscriber persistence', () => {
	let container: Container;
	let kernel: Kernel;
	let subscriberRepository: SubscriberRepository & Repository<Subscriber>;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		subscriberRepository = container.get<SubscriberRepository>(
			'SubscriberRepository'
		) as SubscriberRepository & Repository<Subscriber>;
	});

	afterEach(async () => {
		await kernel.close();
	});

	it('should persist , update and fetch subscriber aggregate with all relations eagerly loaded', async function () {
		const time = new Date();
		const publicKeyResult = PublicKey.create(
			'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
		);
		expect(publicKeyResult.isOk()).toBeTruthy();
		if (publicKeyResult.isErr()) return;

		const subscriber = createDummySubscriber();

		const pendingSubscriptionId =
			subscriberRepository.nextPendingSubscriptionId();
		subscriber.addPendingSubscription(
			pendingSubscriptionId,
			[publicKeyResult.value],
			new Date()
		);
		subscriber.confirmPendingSubscription(pendingSubscriptionId);

		subscriber.addPendingSubscription(
			subscriberRepository.nextPendingSubscriptionId(),
			[new NetworkId('public')],
			new Date()
		);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);

		subscriber.publishNotificationAbout([event]);
		await subscriberRepository.save(subscriber);

		const foundSubscriber = await subscriberRepository.findOne(1);
		expect(foundSubscriber).toBeDefined();
		if (!foundSubscriber) return;
		expect(foundSubscriber.hasSubscriptions()).toBeTruthy();
		foundSubscriber.unMuteNotificationFor(publicKeyResult.value, event.type); //will throw error if relation is null
	});

	it('should find subscriber by pending subscription id', async function () {
		const subscriber = createDummySubscriber();
		const subscriptionId = createDummyPendingSubscriptionId();
		subscriber.addPendingSubscription(
			subscriptionId,
			[new NetworkId('public')],
			new Date()
		);

		await subscriberRepository.save([subscriber]);

		const fetchedSubscriber =
			await subscriberRepository.findOneByPendingSubscriptionId(subscriptionId);

		expect(fetchedSubscriber).toBeInstanceOf(Subscriber);
	});
});
