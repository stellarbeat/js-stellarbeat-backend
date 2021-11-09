import { Container } from 'inversify';
import Kernel from '../../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../../config/__mocks__/configMock';
import { Connection, Repository } from 'typeorm';
import { Subscription } from '../../../../domain/contact/Subscription';
import { ValidatorXUpdatesNotValidatingEvent } from '../../../../domain/event/Event';
import { Contact } from '../../../../domain/contact/Contact';
import { ContactRepository } from '../../../../domain/contact/ContactRepository';
import { NetworkId, PublicKey } from '../../../../domain/event/EventSourceId';
import { PendingSubscription } from '../../../../domain/contact/PendingSubscription';

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
		const publicKeyResult = PublicKey.create(
			'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
		);
		expect(publicKeyResult.isOk()).toBeTruthy();
		if (publicKeyResult.isErr()) return;
		const subscription = Subscription.create({
			eventSourceId: publicKeyResult.value,
			latestNotifications: []
		});
		const contact = Contact.create({
			contactId: contactRepository.nextIdentity()
		});
		contact.addSubscription(subscription);
		contact.addPendingSubscriptions(
			contactRepository.nextPendingEventSourceIdentity(),
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

		contact.publishNotificationAbout([event]);
		await contactRepository.save(contact);

		const foundContact = await contactRepository.findOne(1);
		expect(foundContact).toBeDefined();
		if (!foundContact) return;
		expect(foundContact.subscriptions).toHaveLength(1);
		expect(foundContact.subscriptions[0].latestNotifications).toHaveLength(1);

		const repeatingEventTime = new Date(
			time.getTime() + Subscription.CoolOffPeriod + 1
		);
		const repeatingEventAfterCoolOff = new ValidatorXUpdatesNotValidatingEvent(
			repeatingEventTime,
			publicKeyResult.value,
			{
				numberOfUpdates: 3
			}
		);
		contact.publishNotificationAbout([repeatingEventAfterCoolOff]);
		await contactRepository.save(contact);

		const foundContactSecondTime = await contactRepository.findOne(1);
		expect(foundContactSecondTime).toBeDefined();
		if (!foundContactSecondTime) return;
		expect(foundContactSecondTime.subscriptions).toHaveLength(1);
		expect(
			foundContactSecondTime.subscriptions[0].latestNotifications
		).toHaveLength(1);
		expect(
			foundContactSecondTime.subscriptions[0].latestNotifications[0].time
		).toEqual(repeatingEventTime);
		console.log(foundContactSecondTime.subscriptions[0]);
		expect(
			foundContactSecondTime.subscriptions[0].isSubscribedTo(
				publicKeyResult.value
			)
		).toBeTruthy();
	});
});
