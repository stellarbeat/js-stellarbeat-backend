import { Event, EventData } from '../event/Event';
import { injectable } from 'inversify';
import { Mail } from './Mail';

@injectable()
export class EventToMailMapper {
	map(events: Event<EventData>[]): Mail {
		let message = '[';
		events.forEach((event) => {
			message += `${event.time} - ${event.source.type} - ${event.source.id} - ${event.type}, `;
		});
		message += ']';

		return new Mail(message, 'Something happened!');
	}
}
