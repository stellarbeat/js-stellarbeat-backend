import { injectable } from 'inversify';
import { Mail } from '../../../shared/domain/Mail';
import { ContactNotification } from '../contact/Contact';

@injectable()
export class ContactNotificationToMailMapper {
	static map(contactNotification: ContactNotification): Mail {
		let message = '[';
		contactNotification.events.forEach((event) => {
			message += `${event.time} - ${event.source.type} - ${event.source.id} - ${event.type}, `;
		});
		message += ']';

		return new Mail(message, 'Something happened!');
	}
}
