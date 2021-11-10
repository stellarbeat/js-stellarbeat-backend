import { Contact } from '../Contact';
import { ContactId } from '../ContactId';
import { randomUUID } from 'crypto';
import { ContactPublicReference } from '../ContactPublicReference';

export function createContactDummy(): Contact {
	const contactId = ContactId.create(randomUUID());
	if (contactId.isErr()) throw contactId.error;
	return Contact.create({
		contactId: contactId.value,
		publicReference: ContactPublicReference.create()
	});
}
