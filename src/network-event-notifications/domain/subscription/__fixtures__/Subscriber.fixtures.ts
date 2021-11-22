import { Subscriber } from '../Subscriber';
import { UserId } from '../UserId';
import { randomUUID } from 'crypto';
import { SubscriberReference } from '../SubscriberReference';

export function createDummySubscriber(): Subscriber {
	const userId = UserId.create(randomUUID());
	if (userId.isErr()) throw userId.error;
	return Subscriber.create({
		userId: userId.value,
		SubscriberReference: SubscriberReference.create(),
		registrationDate: new Date()
	});
}
