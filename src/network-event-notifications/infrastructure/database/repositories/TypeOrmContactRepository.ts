import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import { Contact } from '../../../domain/contact/Contact';
import { ContactRepository } from '../../../domain/contact/ContactRepository';
import { ContactId } from '../../../domain/contact/ContactId';
import { v4 as uuidv4 } from 'uuid';
import { PendingSubscriptionId } from '../../../domain/contact/PendingSubscription';
import { ContactPublicReference } from '../../../domain/contact/ContactPublicReference';

@injectable()
@EntityRepository(Contact)
export class TypeOrmContactRepository
	extends Repository<Contact>
	implements ContactRepository
{
	nextIdentity(): ContactId {
		return new ContactId(uuidv4());
	}

	nextPendingEventSourceIdentity(): PendingSubscriptionId {
		return new PendingSubscriptionId(uuidv4());
	}

	async findOneByContactId(contactId: ContactId): Promise<Contact | null> {
		const contact = await super.findOne({
			where: {
				contactId: contactId
			}
		});

		return contact ? contact : null;
	}

	async findOneByPublicReference(
		publicReference: ContactPublicReference
	): Promise<Contact | null> {
		const contact = await super.findOne({
			where: {
				publicReference: publicReference
			}
		});

		return contact ? contact : null;
	}
}
