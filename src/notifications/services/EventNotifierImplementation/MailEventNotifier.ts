import { EventNotifier } from '../EventNotifier';
import { Contact } from '../../domain/Contact';
import { Event, EventData } from '../../domain/Event';
import { ok, Result } from 'neverthrow';
import { injectable } from 'inversify';

@injectable()
export class MailEventNotifier implements EventNotifier {
	async notify(
		contact: Contact,
		events: Event<EventData>[]
	): Promise<Result<void, Error>> {
		return ok(undefined);
	}
}
