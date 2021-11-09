import { Result } from 'neverthrow';
import { ContactId } from '../../network-event-notifications/domain/contact/ContactId';
import { CustomError } from '../errors/CustomError';

export class CreateContactInMailerServiceError extends CustomError {
	constructor(cause?: Error) {
		super(
			'Could not create Contact in Mailer service',
			'CreateContactInMailerServiceError',
			cause
		);
	}
}

export interface Mailer {
	send(
		body: string,
		title: string,
		contactId: ContactId
	): Promise<Result<void, Error>>;

	findOrCreateContact(email: string): Promise<Result<ContactId, Error>>;

	deleteContact(contactId: ContactId): Promise<Result<void, Error>>;
}
