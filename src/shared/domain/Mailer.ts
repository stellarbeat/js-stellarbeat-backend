import { Result } from 'neverthrow';
export interface Mailer {
	send(
		body: string,
		title: string,
		contactId: string
	): Promise<Result<void, Error>>;
}
