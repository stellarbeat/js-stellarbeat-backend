import { Contact } from '../Contact';
import {
	SourceType,
	ValidatorXUpdatesNotValidatingEvent
} from '../../event/Event';
import { EventSubscription } from '../../event-subscription/EventSubscription';
import { ContactId } from '../ContactId';

describe('Latest notification creation', function () {
	it('should create notifications for subscribed events', function () {
		const time = new Date();
		const subscription = EventSubscription.create({
			sourceType: SourceType.Node,
			sourceId: 'A',
			latestNotifications: []
		});
		const contact = Contact.create({
			contactId: new ContactId('id'),
			mailHash: 'mail',
			subscriptions: [subscription]
		});

		const event = new ValidatorXUpdatesNotValidatingEvent(time, 'A', {
			numberOfUpdates: 3
		});

		contact.notifyIfSubscribed([event]);
		expect(contact.getNotificationsAt(time)).toHaveLength(1);
		expect(contact.getNotificationsAt(time)[0]).toHaveProperty(
			'eventSourceId',
			event.source.id
		);
		expect(contact.getNotificationsAt(time)[0]).toHaveProperty(
			'eventSourceType',
			event.source.type
		);
		expect(contact.getNotificationsAt(time)[0]).toHaveProperty(
			'eventType',
			event.type
		);
	});

	it('should not create notifications if the contact is not subscribed to the event', function () {
		const time = new Date();
		const subscription = EventSubscription.create({
			sourceType: SourceType.Organization,
			sourceId: 'A',
			latestNotifications: []
		});

		const contact = Contact.create({
			contactId: new ContactId('id'),
			mailHash: 'mail',
			subscriptions: [subscription]
		});
		const event = new ValidatorXUpdatesNotValidatingEvent(time, 'A', {
			numberOfUpdates: 3
		});

		contact.notifyIfSubscribed([event]);
		expect(contact.getNotificationsAt(time)).toHaveLength(0);
	});
});

describe('CoolOffPeriod handling', function () {
	let subscription: EventSubscription;
	let contact: Contact;
	beforeEach(() => {
		subscription = EventSubscription.create({
			sourceType: SourceType.Node,
			sourceId: 'A',
			latestNotifications: []
		});

		contact = Contact.create({
			contactId: new ContactId('id'),
			mailHash: 'mail',
			subscriptions: [subscription]
		});
	});

	it('should update subscription latest notification if the previous notification for the even type was more then coolOf time ago', function () {
		const time = new Date();
		const previousTime = new Date(
			new Date().getTime() - EventSubscription.CoolOffPeriod - 1
		);

		const previousEvent = new ValidatorXUpdatesNotValidatingEvent(
			previousTime,
			'A',
			{
				numberOfUpdates: 3
			}
		);
		contact.notifyOfSingleEventIfSubscribed(previousEvent);

		const event = new ValidatorXUpdatesNotValidatingEvent(time, 'A', {
			numberOfUpdates: 3
		});
		contact.notifyOfSingleEventIfSubscribed(event);

		expect(subscription.latestNotifications).toHaveLength(1);
		expect(contact.getNotificationsAt(time)).toHaveLength(1);
		expect(contact.getNotificationsAt(previousTime)).toHaveLength(0);
	});

	it('should not create a notification if a previous notification was created less then the coolOff period ago', function () {
		const time = new Date();
		const previousTime = new Date(
			time.getTime() - EventSubscription.CoolOffPeriod + 1
		);
		const previousEvent = new ValidatorXUpdatesNotValidatingEvent(
			previousTime,
			'A',
			{
				numberOfUpdates: 3
			}
		);

		contact.notifyOfSingleEventIfSubscribed(previousEvent);

		const event = new ValidatorXUpdatesNotValidatingEvent(time, 'A', {
			numberOfUpdates: 3
		});
		contact.notifyOfSingleEventIfSubscribed(event);

		expect(contact.getNotificationsAt(time)).toHaveLength(0);
		expect(contact.getNotificationsAt(previousTime)).toHaveLength(1);
	});
});
