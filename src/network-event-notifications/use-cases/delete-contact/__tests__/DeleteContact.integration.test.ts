import { Container, decorate, injectable } from 'inversify';
import { NullMailer } from '../../../../shared/infrastructure/mail/NullMailer';
import Kernel from '../../../../shared/core/Kernel';
import { ContactRepository } from '../../../domain/contact/ContactRepository';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { DeleteContact } from '../DeleteContact';
import { ok } from 'neverthrow';
import Mock = jest.Mock;
import { createContactDummy } from '../../../domain/contact/__fixtures__/Contact.fixtures';
import { randomUUID } from 'crypto';
import { Connection } from 'typeorm';

decorate(injectable(), NullMailer);
jest.mock('../../../../shared/infrastructure/mail/NullMailer');

let container: Container;
const kernel = new Kernel();
let contactRepository: ContactRepository;
jest.setTimeout(60000); //slow integration tests
beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	contactRepository = kernel.container.get('ContactRepository');
});

afterEach(async () => {
	await container.get(Connection).close();
});

it('should return error if contactRef has invalid format', async function () {
	const deleteContact = container.get(DeleteContact);
	const result = await deleteContact.execute({ contactRef: 'invalid' });
	expect(result.isErr()).toBeTruthy();
});

it('should return error if contact is not found', async function () {
	const deleteContact = container.get(DeleteContact);
	const result = await deleteContact.execute({ contactRef: randomUUID() });
	expect(result.isErr()).toBeTruthy();
});

it('should delete contact in remote mail service and in local database', async function () {
	const remoteDeleteFunction = jest.fn().mockResolvedValue(ok(undefined));
	(NullMailer as Mock).mockImplementation(() => {
		return {
			deleteContact: remoteDeleteFunction
		};
	});

	const contact = createContactDummy();
	await contactRepository.save([contact]);

	const deleteContact = container.get(DeleteContact);
	await deleteContact.execute({ contactRef: contact.publicReference.value });

	const fetchedContact = await contactRepository.findOneByContactId(
		contact.contactId
	);
	expect(fetchedContact).toBeNull();
	expect(remoteDeleteFunction).toBeCalledWith(contact.contactId);
});
