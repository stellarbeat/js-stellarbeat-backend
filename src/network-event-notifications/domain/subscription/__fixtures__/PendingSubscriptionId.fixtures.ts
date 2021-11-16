import { PendingSubscriptionId } from '../PendingSubscription';
import { v4 as uuidv4 } from 'uuid';

export function createDummyPendingSubscriptionId() {
	const pendingSubscriptionIdResult = PendingSubscriptionId.create(uuidv4());
	if (pendingSubscriptionIdResult.isErr())
		throw pendingSubscriptionIdResult.error;
	return pendingSubscriptionIdResult.value;
}
