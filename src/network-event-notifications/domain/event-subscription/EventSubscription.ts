import { Event, EventData, SourceType } from '../event/Event';
import { LatestNotification } from './LatestNotification';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Contact } from '../contact/Contact';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';

//Subscribe to events of a specific source type and id. For example Node with ID 'xxxxx' or the Public network
export interface EventSubscriptionProperties {
	sourceType: SourceType;
	sourceId: string;
	latestNotifications: LatestNotification[];
}

@Entity('event_subscription')
export class EventSubscription extends IdentifiedDomainObject {
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
		() => LatestNotification,
		(eventNotification) => eventNotification.eventSubscription,
		{ cascade: true, eager: true }
	)
	latestNotifications: LatestNotification[];

	private constructor(
		sourceId: string,
		sourceType: SourceType,
		latestNotifications: LatestNotification[]
	) {
		super();
		this.sourceId = sourceId;
		this.sourceType = sourceType;
		this.latestNotifications = latestNotifications;
	}

	static create(props: EventSubscriptionProperties): EventSubscription {
		return new EventSubscription(
			props.sourceId,
			props.sourceType,
			props.latestNotifications
		);
	}

	notifyIfSubscribed(event: Event<EventData>): void {
		if (!this.isSubscribedTo(event.source.id, event.source.type)) return;

		let latestNotificationForEvent = this.getLatestNotificationForEvent(event);
		if (
			latestNotificationForEvent &&
			this.eventInCoolOffPeriod(event, latestNotificationForEvent)
		)
			return;

		if (latestNotificationForEvent) {
			latestNotificationForEvent.updateToLatestEvent(event);
			return;
		}

		latestNotificationForEvent = LatestNotification.createFromEvent(event);
		this.addLatestNotification(latestNotificationForEvent);
	}

	protected addLatestNotification(notification: LatestNotification) {
		this.latestNotifications.push(notification);
	}

	isSubscribedTo(sourceId: string, sourceType: SourceType) {
		return this.sourceId === sourceId && this.sourceType === sourceType;
	}

	protected getLatestNotificationForEvent(
		event: Event<EventData>
	): LatestNotification | undefined {
		return this.latestNotifications.find(
			(latestNotification) => latestNotification.eventType === event.type
		);
	}

	protected eventInCoolOffPeriod(
		event: Event<EventData>,
		latestNotification: LatestNotification
	): boolean {
		return (
			event.time.getTime() <=
			latestNotification.time.getTime() + EventSubscription.CoolOffPeriod
		);
	}

	getNotificationsAt(time: Date) {
		return this.latestNotifications.filter(
			(latestNotification) =>
				latestNotification.time.getTime() === time.getTime()
		);
	}
}
