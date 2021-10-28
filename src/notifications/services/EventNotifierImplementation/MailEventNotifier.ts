import { EventNotifier } from '../../domain/event-subscription/EventNotifier';
import { Contact } from '../../domain/contact/Contact';
import { Event, EventData } from '../../domain/event/Event';
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
