import { SourceType } from '../event/Event';
import { Entity } from 'typeorm';

//@Entity('event_subscription_pending')
export class PendingEventSubscription {
	constructor(
		public time: Date,
		public GUID: string,
		public subscriptions: {
			sourceType: SourceType;
			sourceId: string;
		}[]
	) {}
}
