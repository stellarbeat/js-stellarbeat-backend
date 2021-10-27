import { Contact } from '../domain/Contact';
import { Event, EventData } from '../domain/Event';
import { Result } from 'neverthrow';

export interface EventNotifier {
	notify(
		contact: Contact,
		events: Event<EventData>[]
	): Promise<Result<void, Error>>;
}
