import { Contact } from '../Contact';
import {
	NodeXUpdatesInactiveEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../../event/Event';
import { EventSourceSubscription } from '../EventSourceSubscription';
import { ContactId } from '../ContactId';
import { EventSource, OrganizationId, PublicKey } from '../EventSource';

describe('Latest notification creation', function () {
	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (publicKeyResult.isErr()) return;

	it('should create notifications for subscribed events', function () {
		const time = new Date();

		const subscription = EventSourceSubscription.create({
			eventSource: new EventSource(publicKeyResult.value),
			latestNotifications: []
		});
		const contact = Contact.create({
			contactId: new ContactId('id'),
			mailHash: 'mail',
			subscriptions: [subscription]
		});

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			new EventSource(publicKeyResult.value),
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
		const subscription = EventSourceSubscription.create({
			eventSource: new EventSource(new OrganizationId('A')),
			latestNotifications: []
		});

		const contact = Contact.create({
			contactId: new ContactId('id'),
			mailHash: 'mail',
			subscriptions: [subscription]
		});
		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			new EventSource(publicKeyResult.value),
			{
				numberOfUpdates: 3
			}
		);

		expect(contact.publishNotificationAbout([event])).toBeNull();
	});
});

describe('CoolOffPeriod handling', function () {
	let subscription: EventSourceSubscription;
	let contact: Contact;
	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (publicKeyResult.isErr()) return;

	beforeEach(() => {
		const publicKeyResult = PublicKey.create(
			'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
		);
		expect(publicKeyResult.isOk()).toBeTruthy();
		if (publicKeyResult.isErr()) return;
		subscription = EventSourceSubscription.create({
			eventSource: new EventSource(publicKeyResult.value),
			latestNotifications: []
		});

		contact = Contact.create({
			contactId: new ContactId('id'),
			mailHash: 'mail',
			subscriptions: [subscription]
		});
	});

	it('should create notification if the previous notification for the event type was more then coolOf time ago', function () {
		const time = new Date();
		const previousTime = new Date(
			new Date().getTime() - EventSourceSubscription.CoolOffPeriod - 1
		);

		const previousEvent = new ValidatorXUpdatesNotValidatingEvent(
			previousTime,
			new EventSource<PublicKey>(publicKeyResult.value),
			{
				numberOfUpdates: 3
			}
		);
		contact.publishNotificationAbout([previousEvent]);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			new EventSource(publicKeyResult.value),
			{
				numberOfUpdates: 3
			}
		);
		const contactNotification = contact.publishNotificationAbout([event]);

		expect(subscription.latestNotifications).toHaveLength(1);
		expect(contactNotification?.events).toHaveLength(1);
	});

	it('should not create a notification if a previous notification with same source and event type was created less then the coolOff period ago', function () {
		const time = new Date();
		const previousTime = new Date(
			time.getTime() - EventSourceSubscription.CoolOffPeriod + 1
		);
		const previousEvent = new ValidatorXUpdatesNotValidatingEvent(
			previousTime,
			new EventSource<PublicKey>(publicKeyResult.value),
			{
				numberOfUpdates: 3
			}
		);

		contact.publishNotificationAbout([previousEvent]);

		const event = new ValidatorXUpdatesNotValidatingEvent(
			time,
			new EventSource(publicKeyResult.value),
			{
				numberOfUpdates: 3
			}
		);

		expect(contact.publishNotificationAbout([event])).toBeNull();
	});
});
