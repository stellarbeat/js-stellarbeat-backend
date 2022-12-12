import { PendingSubscriptionId } from '../subscription/PendingSubscription';
import { Message } from '../../../shared/domain/Message';
import { Notification } from '../subscription/Notification';

export interface MessageCreator {
	createConfirmSubscriptionMessage(
		pendingSubscriptionId: PendingSubscriptionId
	): Promise<Message>;

	createNotificationMessage(notification: Notification): Promise<Message>;
}
