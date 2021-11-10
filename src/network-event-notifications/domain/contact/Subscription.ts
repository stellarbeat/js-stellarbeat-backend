import { Event, EventData } from '../event/Event';
import { EventNotificationState } from './EventNotificationState';
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
	eventNotificationStates: EventNotificationState[];
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
		() => EventNotificationState,
		(eventNotification) => eventNotification.eventSubscription,
		{ cascade: true, eager: true }
	)
	eventNotificationStates: EventNotificationState[];

	private constructor(
		eventSource: EventSourceId,
		eventNotificationStates: EventNotificationState[]
	) {
		super();
		this.eventSourceId = eventSource;
		this.eventNotificationStates = eventNotificationStates;
	}

	static create(props: SubscriptionProperties): Subscription {
		return new Subscription(props.eventSourceId, props.eventNotificationStates);
	}

	public updateEventNotificationState(event: Event<EventData, EventSourceId>) {
		let eventNotificationState = this.getEventNotificationState(event);

		if (eventNotificationState) {
			eventNotificationState.processEvent(event);
			return;
		}

		eventNotificationState = EventNotificationState.createFromEvent(event);

		this.eventNotificationStates.push(eventNotificationState);
	}

	isSubscribedTo(eventSource: EventSourceId) {
		return this.eventSourceId.equals(eventSource);
	}

	public isNotificationMutedFor(
		event: Event<EventData, EventSourceId>
	): boolean {
		const eventNotificationState = this.getEventNotificationState(event);
		if (!eventNotificationState) return false; //the first notification is never muted

		if (eventNotificationState.ignoreCoolOffPeriod) return false; //the contact decided not to mute the notification

		return this.eventInCoolOffPeriod(event, eventNotificationState); //we avoid sending too many notifications in a row about the same event
	}

	public unMuteNotificationFor(eventType: string) {
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
