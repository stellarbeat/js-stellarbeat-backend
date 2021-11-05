import { Event, EventData, SourceType } from '../event/Event';
import { LatestEventNotification } from './LatestEventNotification';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Contact } from './Contact';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { EventSource, EventSourceId } from './EventSource';

//Subscribe to events of a specific source type and id. For example Node with ID 'xxxxx' or the Public network
export interface EventSubscriptionProperties {
	eventSource: EventSource<EventSourceId>;
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

	@Column(() => EventSource)
	protected eventSource: EventSource<EventSourceId>;

	@OneToMany(
		() => LatestEventNotification,
		(eventNotification) => eventNotification.eventSubscription,
		{ cascade: true, eager: true }
	)
	latestNotifications: LatestEventNotification[];

	private constructor(
		eventSource: EventSource<EventSourceId>,
		latestNotifications: LatestEventNotification[]
	) {
		super();
		this.eventSource = eventSource;
		this.latestNotifications = latestNotifications;
	}

	static create(props: EventSubscriptionProperties): EventSourceSubscription {
		return new EventSourceSubscription(
			props.eventSource,
			props.latestNotifications
		);
	}

	public addOrUpdateLatestNotificationFor(
		event: Event<EventData, EventSource<EventSourceId>>
	) {
		let latestNotificationForEvent = this.getLatestNotificationForEvent(event);

		if (latestNotificationForEvent) {
			latestNotificationForEvent.updateToLatestEvent(event);
			return;
		}

		latestNotificationForEvent = LatestEventNotification.createFromEvent(event);

		this.latestNotifications.push(latestNotificationForEvent);
	}

	isSubscribedTo(eventSource: EventSource<EventSourceId>) {
		return this.eventSource.equals(eventSource);
	}

	protected getLatestNotificationForEvent(
		event: Event<EventData, EventSource<EventSourceId>>
	): LatestEventNotification | undefined {
		return this.latestNotifications.find(
			(latestNotification) =>
				latestNotification.eventType === event.constructor.name
		);
	}

	public eventInCoolOffPeriod(
		event: Event<EventData, EventSource<EventSourceId>>
	): boolean {
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
