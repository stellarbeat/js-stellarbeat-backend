import { Contact } from '../Contact';
import { ValidatorXUpdatesNotValidatingEvent } from '../../event/Event';
import { Subscription } from '../Subscription';
import { ContactId } from '../ContactId';
import { OrganizationId, PublicKey } from '../../event/EventSourceId';

describe('Notification creation', function () {
	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (publicKeyResult.isErr()) return;

	it('should create notifications for subscribed events', function () {
		const time = new Date();

		const subscription = Subscription.create({
			eventSourceId: publicKeyResult.value,
			eventNotificationStates: []
		});
		const contact = Contact.create({
			contactId: new ContactId('id')
		});

		contact.addSubscription(subscription);

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
		const subscription = Subscription.create({
			eventSourceId: new OrganizationId('A'),
			eventNotificationStates: []
		});

		const contact = Contact.create({
			contactId: new ContactId('id')
		});
		contact.addSubscription(subscription);
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
	let subscription: Subscription;
	let contact: Contact;
	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (publicKeyResult.isErr()) return;

	const publicKey = publicKeyResult.value;
	beforeEach(() => {
		subscription = Subscription.create({
			eventSourceId: publicKey,
			eventNotificationStates: []
		});

		contact = Contact.create({
			contactId: new ContactId('id')
		});

		contact.addSubscription(subscription);
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

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);
		const contactNotification = contact.publishNotificationAbout([event]);

		expect(subscription.eventNotificationStates).toHaveLength(1);
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

		expect(subscription.eventNotificationStates).toHaveLength(1);
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

	it('should allow a user to unmute notifications for specific event types in an event source', function () {
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

		contact.unMuteNotificationFor(publicKey, previousEvent.type);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);

		expect(contact.publishNotificationAbout([event])?.events).toHaveLength(1);
	});
});
