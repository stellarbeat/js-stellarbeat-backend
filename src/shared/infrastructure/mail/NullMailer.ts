import { Mailer } from '../../domain/Mailer';
import { err, ok, Result } from 'neverthrow';
import { injectable } from 'inversify';
import { ContactId } from '../../../network-event-notifications/domain/contact/ContactId';
import 'reflect-metadata';

@injectable()
export class NullMailer implements Mailer {
	send(
		body: string,
		title: string,
		contactId: ContactId
	): Promise<Result<void, Error>> {
		console.log(contactId);
		console.log(title);
		console.log(body);
		return Promise.resolve(ok(undefined));
	}

	findOrCreateContact(email: string): Promise<Result<ContactId, Error>> {
		return Promise.resolve(err(new Error('not yet implemented')));
	}

	deleteContact(contactId: ContactId): Promise<Result<void, Error>> {
		console.log('Deleting contact with id', contactId.value);
		return Promise.resolve(ok(undefined));
	}
}
