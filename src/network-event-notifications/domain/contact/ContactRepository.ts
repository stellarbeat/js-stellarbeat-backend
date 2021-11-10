import { ContactId } from './ContactId';
import { Contact } from './Contact';
import { PendingSubscriptionId } from './PendingSubscription';
import { ContactPublicReference } from './ContactPublicReference';

export interface ContactRepository {
	find(): Promise<Contact[]>;
	findOneByContactId(contactId: ContactId): Promise<Contact | null>;
	findOneByPublicReference(
		publicReference: ContactPublicReference
	): Promise<Contact | null>;
	nextIdentity(): ContactId;
	nextPendingEventSourceIdentity(): PendingSubscriptionId;
	save(contacts: Contact[]): Promise<Contact[]>;
	remove(contact: Contact): Promise<Contact>;
}
