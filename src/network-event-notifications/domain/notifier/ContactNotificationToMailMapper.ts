import { injectable } from 'inversify';
import { Mail } from '../../../shared/domain/Mail';
import { ContactEventsNotification } from '../contact/Contact';

@injectable()
export class ContactNotificationToMailMapper {
	static map(contactNotification: ContactEventsNotification): Mail {
		let message = '[';
		contactNotification.events.forEach((event) => {
			message += `${event.time} - ${event.sourceId.value} - ${event.constructor.name}, `;
		});
		message += ']';

		return new Mail(message, 'Something happened!');
	}
}
