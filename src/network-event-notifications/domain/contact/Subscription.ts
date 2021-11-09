import { Event, EventData } from '../event/Event';
import { LatestEventNotification } from './LatestEventNotification';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Contact } from './Contact';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from '../event/EventSourceId';

//Subscribe to events of a specific source type and id. For example Node with ID 'xxxxx' or the Public network
export interface SubscriptionProperties {
	eventSourceId: EventSourceId;
	latestNotifications: LatestEventNotification[];
}

@Entity('contact_subscription')
export class Subscription extends IdentifiedDomainObject {
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

	@Column({
		type: 'jsonb',
		transformer: {
			from(value: { type: string; id: string }): EventSourceId | null {
				if (value === null) return null;
				if (value.type === OrganizationId.name)
					return new OrganizationId(value.id);
				if (value.type === PublicKey.name) {
					const publicKeyResult = PublicKey.create(value.id);
					if (publicKeyResult.isErr()) {
						throw new Error(`corrupt public key in database: ${value.id}`);
					}
					return publicKeyResult.value;
				}
				if (value.type === NetworkId.name) return new NetworkId(value.id);

				throw new Error(`Invalid event source type ${value.type}`);
			},
			to(value: EventSourceId): { type: string; id: string } {
				return {
					type: value.constructor.name,
					id: value.value
				};
			}
		}
	})
	protected eventSourceId: EventSourceId;

	@OneToMany(
		() => LatestEventNotification,
		(eventNotification) => eventNotification.eventSubscription,
		{ cascade: true, eager: true }
	)
	latestNotifications: LatestEventNotification[];

	private constructor(
		eventSource: EventSourceId,
		latestNotifications: LatestEventNotification[]
	) {
		super();
		this.eventSourceId = eventSource;
		this.latestNotifications = latestNotifications;
	}

	static create(props: SubscriptionProperties): Subscription {
		return new Subscription(props.eventSourceId, props.latestNotifications);
	}

	public addOrUpdateLatestNotificationFor(
		event: Event<EventData, EventSourceId>
	) {
		let latestNotificationForEvent = this.getLatestNotificationForEvent(event);

		if (latestNotificationForEvent) {
			latestNotificationForEvent.updateToLatestEvent(event);
			return;
		}

		latestNotificationForEvent = LatestEventNotification.createFromEvent(event);

		this.latestNotifications.push(latestNotificationForEvent);
	}

	isSubscribedTo(eventSource: EventSourceId) {
		return this.eventSourceId.equals(eventSource);
	}

	protected getLatestNotificationForEvent(
		event: Event<EventData, EventSourceId>
	): LatestEventNotification | undefined {
		return this.latestNotifications.find(
			(latestNotification) =>
				latestNotification.eventType === event.constructor.name
		);
	}

	public eventInCoolOffPeriod(event: Event<EventData, EventSourceId>): boolean {
		const latestNotification = this.getLatestNotificationForEvent(event);
		if (!latestNotification) return false;

		return (
			event.time.getTime() <=
			latestNotification.time.getTime() + Subscription.CoolOffPeriod
		);
	}

	protected getNotificationsAt(time: Date) {
		return this.latestNotifications.filter(
			(latestNotification) =>
				latestNotification.time.getTime() === time.getTime()
		);
	}
}
