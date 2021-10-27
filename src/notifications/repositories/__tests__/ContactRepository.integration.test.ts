import { Container } from 'inversify';
import Kernel from '../../../Kernel';
import { ConfigMock } from '../../../__mocks__/configMock';
import { Connection } from 'typeorm';
import { EventSubscription } from '../../domain/event-subscription/EventSubscription';
import {
	SourceType,
	ValidatorXUpdatesNotValidatingEvent
} from '../../domain/Event';
import { Contact } from '../../domain/Contact';
import { ContactRepository } from '../ContactRepository';

describe('Contact persistence', () => {
	let container: Container;
	const kernel = new Kernel();
	let contactRepository: ContactRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		await kernel.initializeContainer(new ConfigMock());
		container = kernel.container;
		contactRepository = container.get(ContactRepository);
	});

	afterEach(async () => {
		await container.get(Connection).close();
	});

	it('should persist , update and fetch contact aggregate with all relations eagerly loaded', async function () {
		const time = new Date();
		const subscription = EventSubscription.create({
			sourceType: SourceType.Node,
			sourceId: 'A',
			latestNotifications: []
		});
		const contact = Contact.create({
			mail: 'mail',
			subscriptions: [subscription]
		});
		const event = new ValidatorXUpdatesNotValidatingEvent(time, 'A', {
			numberOfUpdates: 3
		});

		contact.notifyIfSubscribed([event]);
		await contactRepository.save(contact);

		const foundContact = await contactRepository.findOne(1);
		expect(foundContact).toBeDefined();
		if (!foundContact) return;
		expect(foundContact.mail).toEqual(contact.mail);
		expect(foundContact.eventSubscriptions).toHaveLength(1);
		expect(foundContact.eventSubscriptions[0].latestNotifications).toHaveLength(
			1
		);

		const repeatingEventTime = new Date(
			time.getTime() + EventSubscription.CoolOffPeriod + 1
		);
		const repeatingEventAfterCoolOff = new ValidatorXUpdatesNotValidatingEvent(
			repeatingEventTime,
			'A',
			{
				numberOfUpdates: 3
			}
		);
		contact.notifyIfSubscribed([repeatingEventAfterCoolOff]);
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
