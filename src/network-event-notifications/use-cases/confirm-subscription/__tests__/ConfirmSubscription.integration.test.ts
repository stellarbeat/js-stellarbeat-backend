import { Container } from 'inversify';
import Kernel from '../../../../shared/core/Kernel';
import { ContactRepository } from '../../../domain/contact/ContactRepository';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { Connection } from 'typeorm';
import { ConfirmSubscription } from '../ConfirmSubscription';
import { createDummyPendingSubscriptionId } from '../../../domain/contact/__fixtures__/PendingSubscriptionId.fixtures';
import { createContactDummy } from '../../../domain/contact/__fixtures__/Contact.fixtures';
import { NetworkId } from '../../../domain/event/EventSourceId';

let container: Container;
const kernel = new Kernel();
let contactRepository: ContactRepository;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	contactRepository = kernel.container.get('ContactRepository');
});

afterAll(async () => {
	await container.get(Connection).close();
});

it('should return error if contact is not found', async function () {
	const confirm = container.get(ConfirmSubscription);
	const result = await confirm.execute({
		pendingSubscriptionId: createDummyPendingSubscriptionId().value
	});
	expect(result.isErr()).toBeTruthy();
});

it('should return error if pending subscription id has invalid format', async function () {
	const confirm = container.get(ConfirmSubscription);
	const result = await confirm.execute({
		pendingSubscriptionId: 'invalid'
	});
	expect(result.isErr()).toBeTruthy();
});

it('should return error if pending subscription id is not linked to contact', async function () {
	const contact = createContactDummy();
	await contactRepository.save([contact]);
	const confirm = container.get(ConfirmSubscription);
	const result = await confirm.execute({
		pendingSubscriptionId: createDummyPendingSubscriptionId().value
	});
	expect(result.isErr()).toBeTruthy();
});

it('should create the actual subscriptions when confirmed', async function () {
	const contact = createContactDummy();
	const subId = createDummyPendingSubscriptionId();
	contact.addPendingSubscription(subId, [new NetworkId('public')], new Date());
	await contactRepository.save([contact]);

	const confirm = container.get(ConfirmSubscription);
	const result = await confirm.execute({
		pendingSubscriptionId: subId.value
	});

	expect(result.isOk()).toBeTruthy();
});
