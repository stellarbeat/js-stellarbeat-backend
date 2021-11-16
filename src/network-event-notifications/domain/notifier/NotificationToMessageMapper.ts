import { injectable } from 'inversify';
import { Message } from '../../../shared/domain/Message';
import { Notification } from '../subscription/Subscriber';

@injectable()
export class NotificationToMessageMapper {
	static map(notification: Notification): Message {
		let message = '[';
		notification.events.forEach((event) => {
			message += `${event.time} - ${event.sourceId.value} - ${event.type}, `;
		});
		message += ']';

		return new Message(message, 'Something happened!');
	}
}
