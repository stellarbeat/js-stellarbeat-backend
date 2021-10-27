import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import { Contact } from '../domain/Contact';

@injectable()
@EntityRepository(Contact)
export class ContactRepository extends Repository<Contact> {}
