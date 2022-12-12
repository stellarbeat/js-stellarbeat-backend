import { Subscriber } from '../Subscriber';
import { ValidatorXUpdatesNotValidatingEvent } from '../../event/Event';
import { Subscription } from '../Subscription';
import {
	NetworkId,
	OrganizationId,
	PublicKey
} from '../../event/EventSourceId';
import { createDummySubscriber } from '../__fixtures__/Subscriber.fixtures';
import { createDummyPendingSubscriptionId } from '../__fixtures__/PendingSubscriptionId.fixtures';

function getPublicKey(): PublicKey {
	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	if (publicKeyResult.isErr()) throw publicKeyResult.error;

	return publicKeyResult.value;
}

describe('Subscriptions', () => {
	it('should subscribe', function () {
		const subscriber = createDummySubscriber();
		const pendingSubscriptionId = createDummyPendingSubscriptionId();
		subscriber.addPendingSubscription(
			pendingSubscriptionId,
			[getPublicKey()],
			new Date()
		);
		const result = subscriber.confirmPendingSubscription(pendingSubscriptionId);
		expect(result.isOk()).toBeTruthy();

		expect(subscriber.isSubscribedTo(getPublicKey())).toBeTruthy();
	});

	it('should not subscribe wrong pending subscription ids', function () {
		const subscriber = createDummySubscriber();
		const pendingSubscriptionId = createDummyPendingSubscriptionId();
		subscriber.addPendingSubscription(
			pendingSubscriptionId,
			[getPublicKey()],
			new Date()
		);

		const result = subscriber.confirmPendingSubscription(
			createDummyPendingSubscriptionId()
		);
		expect(result.isErr()).toBeTruthy();
		expect(subscriber.isSubscribedTo(getPublicKey())).toBeFalsy();
	});

	it('should not subscribe when no pending subscription was yet created', function () {
		const subscriber = createDummySubscriber();
		const result = subscriber.confirmPendingSubscription(
			createDummyPendingSubscriptionId()
		);
		expect(result.isErr()).toBeTruthy();
		expect(subscriber.hasSubscriptions()).toBeFalsy();
	});

	it('should remove older subscriptions when confirming anew', function () {
		const subscriber = createDummySubscriber();
		const pendingSubscriptionId = createDummyPendingSubscriptionId();
		subscriber.addPendingSubscription(
			pendingSubscriptionId,
			[getPublicKey()],
			new Date()
		);
		subscriber.confirmPendingSubscription(pendingSubscriptionId);
		subscriber.addPendingSubscription(
			pendingSubscriptionId,
			[new NetworkId('public')],
			new Date()
		);
		subscriber.confirmPendingSubscription(pendingSubscriptionId);

		expect(subscriber.isSubscribedTo(new NetworkId('public'))).toBeTruthy();
		expect(subscriber.isSubscribedTo(getPublicKey())).toBeFalsy();
	});
});

describe('Notification creation', function () {
	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (publicKeyResult.isErr()) return;

	it('should create notifications for subscribed events', function () {
		const time = new Date();

		const subscriber = createDummySubscriber();

		const pendingSubscriptionId = createDummyPendingSubscriptionId();
		subscriber.addPendingSubscription(
			pendingSubscriptionId,
			[publicKeyResult.value],
			new Date()
		);
		subscriber.confirmPendingSubscription(pendingSubscriptionId);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);

		const notification = subscriber.publishNotificationAbout([event]);
		expect(notification?.events).toHaveLength(1);
		expect(notification?.events[0]).toEqual(event);
	});

	it('should not create notifications if the subscriber is not subscribed to the event', function () {
		const time = new Date();
		const subscriber = createDummySubscriber();

		const pendingSubscriptionId = createDummyPendingSubscriptionId();
		subscriber.addPendingSubscription(
			pendingSubscriptionId,
			[new OrganizationId('A')],
			new Date()
		);
		subscriber.confirmPendingSubscription(pendingSubscriptionId);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);

		expect(subscriber.publishNotificationAbout([event])).toBeNull();
	});
});

describe('CoolOffPeriod handling', function () {
	let subscriber: Subscriber;
	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (publicKeyResult.isErr()) return;

	const publicKey = publicKeyResult.value;
	beforeEach(() => {
		subscriber = createDummySubscriber();
		const pendingSubscriptionId = createDummyPendingSubscriptionId();
		subscriber.addPendingSubscription(
			pendingSubscriptionId,
			[publicKey],
			new Date()
		);
		subscriber.confirmPendingSubscription(pendingSubscriptionId);
	});

	it('should create notification during the event notification coolOff period if notifications for the event are not muted', () => {
		const time = new Date();
		const previousTime = new Date(
			new Date().getTime() - Subscription.CoolOffPeriod + 1
		);

		const previousEvent = new ValidatorXUpdatesNotValidatingEvent(
			previousTime,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);
		subscriber.publishNotificationAbout([previousEvent]);
		subscriber.unMuteNotificationFor(publicKey, previousEvent.type);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);
		const notification = subscriber.publishNotificationAbout([event]);
		expect(notification?.events).toHaveLength(1);
	});

	it('should create notification if the previous notification for the event type was more then coolOf time ago', function () {
		const time = new Date();
		const previousTime = new Date(
			new Date().getTime() - Subscription.CoolOffPeriod - 1
		);

		const previousEvent = new ValidatorXUpdatesNotValidatingEvent(
			previousTime,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);
		subscriber.publishNotificationAbout([previousEvent]);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);
		const notification = subscriber.publishNotificationAbout([event]);

		expect(notification?.events).toHaveLength(1);
	});

	it('should not create a notification if a previous notification with same source and event type was created less then the coolOff period ago', function () {
		const time = new Date();
		const previousTime = new Date(
			time.getTime() - Subscription.CoolOffPeriod + 1
		);
		const previousEvent = new ValidatorXUpdatesNotValidatingEvent(
			previousTime,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);

		subscriber.publishNotificationAbout([previousEvent]);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);

		expect(subscriber.publishNotificationAbout([event])).toBeNull();
	});
});
