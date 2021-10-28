import { ContactId } from './ContactId';
import { Contact } from './Contact';

export interface ContactRepository {
	nextIdentity(): ContactId;
	save(contact: Contact): Promise<Contact>;
}
