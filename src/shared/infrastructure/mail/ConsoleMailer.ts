import { Mailer } from '../../domain/Mailer';
import { ok, Result } from 'neverthrow';
import { injectable } from 'inversify';

@injectable()
export class ConsoleMailer implements Mailer {
	send(
		body: string,
		title: string,
		contactId: string
	): Promise<Result<void, Error>> {
		console.log(contactId);
		console.log(title);
		console.log(body);
		return Promise.resolve(ok(undefined));
	}
}
