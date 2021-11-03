import { Event, EventData, SourceType } from '../event/Event';
import { LatestEventNotification } from './LatestEventNotification';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Contact } from './Contact';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';

//Subscribe to events of a specific source type and id. For example Node with ID 'xxxxx' or the Public network
export interface EventSubscriptionProperties {
	sourceType: SourceType;
	sourceId: string;
	latestNotifications: LatestEventNotification[];
}

@Entity('event_subscription')
export class EventSourceSubscription extends IdentifiedDomainObject {
	//don't send events of the same type again during the coolOffPeriod
	static CoolOffPeriod = 4000;

	/**
	 * @deprecated needed by typeorm but has no use
	 */
	@ManyToOne(() => Contact, {
		nullable: false,
		eager: false
	})
	public contact?: Contact;

	@Column({ type: 'enum', enum: SourceType, nullable: false })
	sourceType: SourceType;

	@Column({ type: 'text', nullable: false })
	sourceId: string;

	@OneToMany(
		() => LatestEventNotification,
		(eventNotification) => eventNotification.eventSubscription,
		{ cascade: true, eager: true }
	)
	latestNotifications: LatestEventNotification[];

	private constructor(
		sourceId: string,
		sourceType: SourceType,
		latestNotifications: LatestEventNotification[]
	) {
		super();
		this.sourceId = sourceId;
		this.sourceType = sourceType;
		this.latestNotifications = latestNotifications;
	}

	static create(props: EventSubscriptionProperties): EventSourceSubscription {
		return new EventSourceSubscription(
			props.sourceId,
			props.sourceType,
			props.latestNotifications
		);
	}

	public addOrUpdateLatestNotificationFor(event: Event<EventData>) {
		let latestNotificationForEvent = this.getLatestNotificationForEvent(event);

		if (latestNotificationForEvent) {
			latestNotificationForEvent.updateToLatestEvent(event);
			return;
		}

		latestNotificationForEvent = LatestEventNotification.createFromEvent(event);

		this.latestNotifications.push(latestNotificationForEvent);
	}

	isSubscribedTo(sourceId: string, sourceType: SourceType) {
		return this.sourceId === sourceId && this.sourceType === sourceType;
	}

	protected getLatestNotificationForEvent(
		event: Event<EventData>
	): LatestEventNotification | undefined {
		return this.latestNotifications.find(
			(latestNotification) => latestNotification.eventType === event.type
		);
	}

	public eventInCoolOffPeriod(event: Event<EventData>): boolean {
		const latestNotification = this.getLatestNotificationForEvent(event);
		if (!latestNotification) return false;

		return (
			event.time.getTime() <=
			latestNotification.time.getTime() + EventSourceSubscription.CoolOffPeriod
		);
	}

	protected getNotificationsAt(time: Date) {
		return this.latestNotifications.filter(
			(latestNotification) =>
				latestNotification.time.getTime() === time.getTime()
		);
	}
}
