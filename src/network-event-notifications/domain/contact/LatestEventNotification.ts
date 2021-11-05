import { Event, EventData } from '../event/Event';
import { EventSourceSubscription } from './EventSourceSubscription';
import { Column, Entity, ManyToOne } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { EventSource, EventSourceId } from './EventSource';

@Entity('event_subscription_latest_notification')
export class LatestEventNotification extends IdentifiedDomainObject {
	@Column({ type: 'timestamptz', nullable: false })
	public time: Date;

	@Column({ type: 'varchar', nullable: false })
	eventType: string;

	/**
	 * @deprecated only needed for typeorm schema
	 */
	@ManyToOne(
		() => EventSourceSubscription,
		(eventSubscription) => eventSubscription.latestNotifications,
		{ eager: false, nullable: false }
	)
	public eventSubscription?: EventSourceSubscription;

	private constructor(time: Date, eventType: string) {
		super();
		this.time = time;
		this.eventType = eventType;
	}

	static createFromEvent(event: Event<EventData, EventSource<EventSourceId>>) {
		return new LatestEventNotification(event.time, event.constructor.name);
	}

	public updateToLatestEvent(
		event: Event<EventData, EventSource<EventSourceId>>
	) {
		this.time = event.time;
	}
}
