import { UserId } from './UserId';
import { Subscriber } from './Subscriber';
import { PendingSubscriptionId } from './PendingSubscription';
import { SubscriberReference } from './SubscriberReference';

export interface SubscriberRepository {
	find(): Promise<Subscriber[]>;
	findOneByUserId(userId: UserId): Promise<Subscriber | null>;
	findOneBySubscriberReference(
		subscriberReference: SubscriberReference
	): Promise<Subscriber | null>;
	findOneByPendingSubscriptionId(
		pendingSubscriptionId: PendingSubscriptionId
	): Promise<Subscriber | null>;
	nextPendingSubscriptionId(): PendingSubscriptionId;
	save(subscribers: Subscriber[]): Promise<Subscriber[]>;
	remove(subscriber: Subscriber): Promise<Subscriber>;
}
