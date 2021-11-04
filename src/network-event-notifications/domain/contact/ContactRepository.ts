import { ContactId } from './ContactId';
import { Contact } from './Contact';

export interface ContactRepository {
	find(): Promise<Contact[]>;
	findOneByMailHash(mailHash: string): Promise<Contact | null>;
	nextIdentity(): ContactId;
	save(contacts: Contact[]): Promise<Contact[]>;
}
