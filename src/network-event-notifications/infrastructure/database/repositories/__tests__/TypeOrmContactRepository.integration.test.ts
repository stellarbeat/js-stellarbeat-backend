import { Container } from 'inversify';
import Kernel from '../../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../../config/__mocks__/configMock';
import { Connection, Repository } from 'typeorm';
import { ValidatorXUpdatesNotValidatingEvent } from '../../../../domain/event/Event';
import { Contact } from '../../../../domain/contact/Contact';
import { ContactRepository } from '../../../../domain/contact/ContactRepository';
import { NetworkId, PublicKey } from '../../../../domain/event/EventSourceId';
import { createContactDummy } from '../../../../domain/contact/__fixtures__/Contact.fixtures';

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

		const contact = createContactDummy();

		const pendingSubscriptionId =
			contactRepository.nextPendingEventSourceIdentity();
		contact.addPendingSubscription(
			pendingSubscriptionId,
			[publicKeyResult.value],
			new Date()
		);
		contact.confirmPendingSubscription(pendingSubscriptionId);

		contact.addPendingSubscription(
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
		expect(foundContact.hasSubscriptions()).toBeTruthy();
		foundContact.unMuteNotificationFor(publicKeyResult.value, event.type); //will throw error if relation is null
	});
});
