import { Event, EventData } from '../event/Event';
import { Subscription } from './Subscription';
import { Column, Entity, ManyToOne } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { EventSourceId } from '../event/EventSourceId';

@Entity('contact_event_notification_state')
export class EventNotificationState extends IdentifiedDomainObject {
	@Column({ type: 'timestamptz', nullable: false })
	public latestSendTime: Date;

	@Column({ type: 'varchar', nullable: false })
	eventType: string;

	@Column({ type: 'boolean', default: false })
	public ignoreCoolOffPeriod = false;

	/**
	 * @deprecated only needed for typeorm schema
	 */
	@ManyToOne(
		() => Subscription,
		(eventSubscription) => eventSubscription.eventNotificationStates,
		{ eager: false, nullable: false }
	)
	public eventSubscription?: Subscription;

	private constructor(time: Date, eventType: string) {
		super();
		this.latestSendTime = time;
		this.eventType = eventType;
	}

	static createFromEvent(event: Event<EventData, EventSourceId>) {
		return new EventNotificationState(event.time, event.type);
	}

	public processEvent(event: Event<EventData, EventSourceId>) {
		this.latestSendTime = event.time;
		this.ignoreCoolOffPeriod = false;
	}
}
