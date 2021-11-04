import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import { Contact } from '../../../domain/contact/Contact';
import { ContactRepository } from '../../../domain/contact/ContactRepository';
import { ContactId } from '../../../domain/contact/ContactId';
import { v4 as uuidv4 } from 'uuid';

@injectable()
@EntityRepository(Contact)
export class TypeOrmContactRepository
	extends Repository<Contact>
	implements ContactRepository
{
	nextIdentity(): ContactId {
		return new ContactId(uuidv4());
	}

	async findOneByMailHash(mailHash: string): Promise<Contact | null> {
		const contact = await super.findOne({
			where: {
				mailHash: mailHash
			}
		});

		return contact ? contact : null;
	}
}
