import { Container } from 'inversify';
import Kernel from '../../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../../config/__mocks__/configMock';
import { Connection, Repository } from 'typeorm';
import { EventSourceSubscription } from '../../../../domain/contact/EventSourceSubscription';
import {
	SourceType,
	ValidatorXUpdatesNotValidatingEvent
} from '../../../../domain/event/Event';
import { Contact } from '../../../../domain/contact/Contact';
import { ContactRepository } from '../../../../domain/contact/ContactRepository';

describe('Contact persistence', () => {
	let container: Container;
	const kernel = new Kernel();
	let contactRepository: ContactRepository & Repository<Contact>;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		await kernel.initializeContainer(new ConfigMock());
		container = kernel.container;
		contactRepository = container.get<ContactRepository>(
			'ContactRepository'
		) as ContactRepository & Repository<Contact>;
	});

	afterEach(async () => {
		await container.get(Connection).close();
	});

	it('should persist , update and fetch contact aggregate with all relations eagerly loaded', async function () {
		const time = new Date();
		const subscription = EventSourceSubscription.create({
			sourceType: SourceType.Node,
			sourceId: 'A',
			latestNotifications: []
		});
		const contact = Contact.create({
			contactId: contactRepository.nextIdentity(),
			mailHash: 'mail',
			subscriptions: [subscription]
		});
		const event = new ValidatorXUpdatesNotValidatingEvent(time, 'A', {
			numberOfUpdates: 3
		});

		contact.publishNotificationAbout([event]);
		await contactRepository.save(contact);

		const foundContact = await contactRepository.findOne(1);
		expect(foundContact).toBeDefined();
		if (!foundContact) return;
		expect(foundContact.mailHash).toEqual(contact.mailHash);
		expect(foundContact.eventSubscriptions).toHaveLength(1);
		expect(foundContact.eventSubscriptions[0].latestNotifications).toHaveLength(
			1
		);

		const repeatingEventTime = new Date(
			time.getTime() + EventSourceSubscription.CoolOffPeriod + 1
		);
		const repeatingEventAfterCoolOff = new ValidatorXUpdatesNotValidatingEvent(
			repeatingEventTime,
			'A',
			{
				numberOfUpdates: 3
			}
		);
		contact.publishNotificationAbout([repeatingEventAfterCoolOff]);
		await contactRepository.save(contact);

		const foundContactSecondTime = await contactRepository.findOne(1);
		expect(foundContactSecondTime).toBeDefined();
		if (!foundContactSecondTime) return;
		expect(foundContactSecondTime.eventSubscriptions).toHaveLength(1);
		expect(
			foundContactSecondTime.eventSubscriptions[0].latestNotifications
		).toHaveLength(1);
		expect(
			foundContactSecondTime.eventSubscriptions[0].latestNotifications[0].time
		).toEqual(repeatingEventTime);
		console.log(foundContactSecondTime);
	});
});
