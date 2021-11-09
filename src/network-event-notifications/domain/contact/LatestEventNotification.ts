import { Event, EventData } from '../event/Event';
import { Subscription } from './Subscription';
import { Column, Entity, ManyToOne } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { EventSourceId } from '../event/EventSourceId';

@Entity('contact_subscription_latest_event_notification')
export class LatestEventNotification extends IdentifiedDomainObject {
	@Column({ type: 'timestamptz', nullable: false })
	public time: Date;

	@Column({ type: 'varchar', nullable: false })
	eventType: string;

	/**
	 * @deprecated only needed for typeorm schema
	 */
	@ManyToOne(
		() => Subscription,
		(eventSubscription) => eventSubscription.latestNotifications,
		{ eager: false, nullable: false }
	)
	public eventSubscription?: Subscription;

	private constructor(time: Date, eventType: string) {
		super();
		this.time = time;
		this.eventType = eventType;
	}

	static createFromEvent(event: Event<EventData, EventSourceId>) {
		return new LatestEventNotification(event.time, event.constructor.name);
	}

	public updateToLatestEvent(event: Event<EventData, EventSourceId>) {
		this.time = event.time;
	}
}
