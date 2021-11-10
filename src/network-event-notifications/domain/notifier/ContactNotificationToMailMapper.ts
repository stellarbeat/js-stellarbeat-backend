import { injectable } from 'inversify';
import { Mail } from '../../../shared/domain/Mail';
import { Notification } from '../contact/Contact';

@injectable()
export class ContactNotificationToMailMapper {
	static map(contactNotification: Notification): Mail {
		let message = '[';
		contactNotification.events.forEach((event) => {
			message += `${event.time} - ${event.sourceId.value} - ${event.type}, `;
		});
		message += ']';

		return new Mail(message, 'Something happened!');
	}
}
