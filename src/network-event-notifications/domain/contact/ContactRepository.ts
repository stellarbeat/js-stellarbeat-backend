import { ContactId } from './ContactId';
import { Contact } from './Contact';
import { PendingSubscriptionId } from './PendingSubscription';

export interface ContactRepository {
	find(): Promise<Contact[]>;
	findOneByContactId(contactId: ContactId): Promise<Contact | null>;
	nextIdentity(): ContactId;
	nextPendingEventSourceIdentity(): PendingSubscriptionId;
	save(contacts: Contact[]): Promise<Contact[]>;
}
