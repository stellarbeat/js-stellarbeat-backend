import { Entity } from 'typeorm';
import { EventSourceId } from './EventSourceId';

//@Entity('event_subscription_pending')
export class PendingEventSubscription {
	constructor(
		public time: Date,
		public GUID: string,
		public subscriptions: {
			eventSourceId: EventSourceId;
		}[]
	) {}
}
