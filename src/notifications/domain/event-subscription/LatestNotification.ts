import { Event, EventData, EventType, SourceType } from '../Event';
import { EventSubscription } from './EventSubscription';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('event_subscription_latest_notification')
export class LatestNotification {
	@PrimaryGeneratedColumn()
	id?: number;

	@Column({ type: 'timestamptz', nullable: false })
	public time: Date;

	@Column({ type: 'text', nullable: false })
	eventSourceId: string;

	@Column({ type: 'enum', enum: SourceType, nullable: false })
	eventSourceType: SourceType;

	@Column({ type: 'enum', enum: EventType, nullable: false })
	eventType: EventType;

	/**
	 * @deprecated only needed for typeorm schema
	 */
	@ManyToOne(
		() => EventSubscription,
		(eventSubscription) => eventSubscription.latestNotifications,
		{ eager: false, nullable: false }
	)
	public eventSubscription?: EventSubscription;

	private constructor(
		time: Date,
		eventType: EventType,
		eventSourceId: string,
		eventSourceType: SourceType,
		id?: number
	) {
		this.time = time;
		this.id = id;
		this.eventSourceId = eventSourceId;
		this.eventSourceType = eventSourceType;
		this.eventType = eventType;
	}

	static createFromEvent(event: Event<EventData>, id?: number) {
		return new LatestNotification(
			event.time,
			event.type,
			event.source.id,
			event.source.type,
			id
		);
	}

	public updateToLatestEvent(event: Event<EventData>) {
		this.time = event.time;
		this.eventType = event.type;
		this.eventSourceType = event.source.type;
		this.eventSourceId = event.source.id;
	}
}
