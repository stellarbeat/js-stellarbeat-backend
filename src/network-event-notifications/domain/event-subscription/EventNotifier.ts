import { Contact } from '../contact/Contact';
import { Event, EventData } from '../event/Event';
import { Result } from 'neverthrow';

export interface EventNotifier {
	notify(
		contact: Contact,
		events: Event<EventData>[]
	): Promise<Result<void, Error>>;
}
