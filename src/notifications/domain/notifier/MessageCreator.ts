import { PendingSubscriptionId } from '../subscription/PendingSubscription';
import { Message } from '../../../core/domain/Message';
import { Notification } from '../subscription/Notification';
import { SubscriberReference } from '../subscription/SubscriberReference';

export interface MessageCreator {
	createConfirmSubscriptionMessage(
		pendingSubscriptionId: PendingSubscriptionId
	): Promise<Message>;

	createNotificationMessage(notification: Notification): Promise<Message>;

	createUnsubscribeMessage(
		subscriberReference: SubscriberReference,
		time: Date
	): Promise<Message>;
}
