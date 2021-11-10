import { Contact } from '../Contact';
import { ValidatorXUpdatesNotValidatingEvent } from '../../event/Event';
import { Subscription } from '../Subscription';
import { ContactId } from '../ContactId';
import {
	NetworkId,
	OrganizationId,
	PublicKey
} from '../../event/EventSourceId';
import { PendingSubscriptionId } from '../PendingSubscription';

function getPublicKey(): PublicKey {
	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	if (publicKeyResult.isErr()) throw publicKeyResult.error;

	return publicKeyResult.value;
}

function getContact(): Contact {
	return Contact.create({
		contactId: new ContactId('id')
	});
}

describe('Subscriptions', () => {
	it('should subscribe', function () {
		const contact = getContact();
		const pendingSubscriptionId = new PendingSubscriptionId('1');
		contact.addPendingSubscription(
			pendingSubscriptionId,
			[getPublicKey()],
			new Date()
		);
		contact.confirmPendingSubscription(pendingSubscriptionId);

		expect(contact.isSubscribedTo(getPublicKey())).toBeTruthy();
	});

	it('should not subscribe wrong pending subscription ids', function () {
		const contact = getContact();
		const pendingSubscriptionId = new PendingSubscriptionId('1');
		contact.addPendingSubscription(
			pendingSubscriptionId,
			[getPublicKey()],
			new Date()
		);

		contact.confirmPendingSubscription(new PendingSubscriptionId('2'));
		expect(contact.isSubscribedTo(getPublicKey())).toBeFalsy();
	});

	it('should not subscribe when no pending subscription was yet created', function () {
		const contact = getContact();
		contact.confirmPendingSubscription(new PendingSubscriptionId('1'));
		expect(contact.hasSubscriptions()).toBeFalsy();
	});

	it('should remove older subscriptions when confirming anew', function () {
		const contact = getContact();
		const pendingSubscriptionId = new PendingSubscriptionId('1');
		contact.addPendingSubscription(
			pendingSubscriptionId,
			[getPublicKey()],
			new Date()
		);
		contact.confirmPendingSubscription(pendingSubscriptionId);
		contact.addPendingSubscription(
			pendingSubscriptionId,
			[new NetworkId('public')],
			new Date()
		);
		contact.confirmPendingSubscription(pendingSubscriptionId);

		expect(contact.isSubscribedTo(new NetworkId('public'))).toBeTruthy();
		expect(contact.isSubscribedTo(getPublicKey())).toBeFalsy();
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

		const contact = Contact.create({
			contactId: new ContactId('id')
		});

		const pendingSubscriptionId = new PendingSubscriptionId('1');
		contact.addPendingSubscription(
			pendingSubscriptionId,
			[publicKeyResult.value],
			new Date()
		);
		contact.confirmPendingSubscription(pendingSubscriptionId);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);

		const contactNotification = contact.publishNotificationAbout([event]);
		expect(contactNotification?.events).toHaveLength(1);
		expect(contactNotification?.events[0]).toEqual(event);
	});

	it('should not create notifications if the contact is not subscribed to the event', function () {
		const time = new Date();
		const contact = Contact.create({
			contactId: new ContactId('id')
		});

		const pendingSubscriptionId = new PendingSubscriptionId('1');
		contact.addPendingSubscription(
			pendingSubscriptionId,
			[new OrganizationId('A')],
			new Date()
		);
		contact.confirmPendingSubscription(pendingSubscriptionId);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);

		expect(contact.publishNotificationAbout([event])).toBeNull();
	});
});

describe('CoolOffPeriod handling', function () {
	let contact: Contact;
	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (publicKeyResult.isErr()) return;

	const publicKey = publicKeyResult.value;
	beforeEach(() => {
		contact = Contact.create({
			contactId: new ContactId('id')
		});
		const pendingSubscriptionId = new PendingSubscriptionId('1');
		contact.addPendingSubscription(
			pendingSubscriptionId,
			[publicKey],
			new Date()
		);
		contact.confirmPendingSubscription(pendingSubscriptionId);
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
		contact.publishNotificationAbout([previousEvent]);
		contact.unMuteNotificationFor(publicKey, previousEvent.type);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);
		const contactNotification = contact.publishNotificationAbout([event]);
		expect(contactNotification?.events).toHaveLength(1);
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
		contact.publishNotificationAbout([previousEvent]);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);
		const contactNotification = contact.publishNotificationAbout([event]);

		expect(contactNotification?.events).toHaveLength(1);
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

		contact.publishNotificationAbout([previousEvent]);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);

		expect(contact.publishNotificationAbout([event])).toBeNull();
	});
});
