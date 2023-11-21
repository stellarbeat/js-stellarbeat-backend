import { Event, EventData, EventType } from '../event/Event';
import { EventNotificationState } from './EventNotificationState';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Subscriber } from './Subscriber';
import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from '../event/EventSourceId';
import { CoreEntity } from '../../../core/domain/CoreEntity';

//Subscribe to events of a specific source type and id. For example Node with ID 'xxxxx' or the Public network
export interface SubscriptionProperties {
	eventSourceId: EventSourceId;
	subscriptionDate: Date;
}

@Entity('subscription')
export class Subscription extends CoreEntity {
	//don't send events of the same type again during the coolOffPeriod
	static CoolOffPeriod = 1000 * 60 * 60 * 24;

	@ManyToOne(() => Subscriber, {
		nullable: false,
		eager: false,
		orphanedRowAction: 'delete',
		onDelete: 'CASCADE'
	})
	public subscriber?: Subscriber;

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
		() => EventNotificationState,
		(eventNotification) => eventNotification.eventSubscription,
		{ cascade: true, eager: true }
	)
	eventNotificationStates: EventNotificationState[];

	@Column({ type: 'timestamptz', nullable: false })
	public subscriptionDate: Date;

	private constructor(
		eventSource: EventSourceId,
		eventNotificationStates: EventNotificationState[],
		subscriptionDate: Date
	) {
		super();
		this.eventSourceId = eventSource;
		this.eventNotificationStates = eventNotificationStates;
		this.subscriptionDate = subscriptionDate;
	}

	static create(props: SubscriptionProperties): Subscription {
		return new Subscription(props.eventSourceId, [], props.subscriptionDate);
	}

	public updateEventNotificationState(event: Event<EventData, EventSourceId>) {
		let eventNotificationState = this.getEventNotificationState(event);

		if (eventNotificationState) {
			eventNotificationState.processEvent(event);
			return;
		}

		eventNotificationState = EventNotificationState.createFromEvent(event);

		this.eventNotificationStates.push(eventNotificationState);
		eventNotificationState.eventSubscription = this;
	}

	isSubscribedTo(eventSource: EventSourceId) {
		return this.eventSourceId.equals(eventSource);
	}

	public isNotificationMutedFor(
		event: Event<EventData, EventSourceId>
	): boolean {
		const eventNotificationState = this.getEventNotificationState(event);
		if (!eventNotificationState) return false; //the first notification is never muted

		if (eventNotificationState.ignoreCoolOffPeriod) return false; //the subscriber decided not to mute the notification

		return this.eventInCoolOffPeriod(event, eventNotificationState); //we avoid sending too many notifications in a row about the same event
	}

	public unMuteNotificationFor(eventType: EventType) {
		const eventNotificationState = this.eventNotificationStates.find(
			(state) => state.eventType === eventType
		);
		if (eventNotificationState)
			eventNotificationState.ignoreCoolOffPeriod = true;
	}

	protected getEventNotificationState(
		event: Event<EventData, EventSourceId>
	): EventNotificationState | undefined {
		return this.eventNotificationStates.find(
			(latestNotification) => latestNotification.eventType === event.type
		);
	}

	protected eventInCoolOffPeriod(
		event: Event<EventData, EventSourceId>,
		eventNotificationState: EventNotificationState
	): boolean {
		return (
			event.time.getTime() <=
			eventNotificationState.latestSendTime.getTime() +
				Subscription.CoolOffPeriod
		);
	}

	protected getNotificationsAt(time: Date) {
		return this.eventNotificationStates.filter(
			(latestNotification) =>
				latestNotification.latestSendTime.getTime() === time.getTime()
		);
	}
}
