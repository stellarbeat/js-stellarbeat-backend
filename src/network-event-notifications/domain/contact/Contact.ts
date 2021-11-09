import { Event, EventData } from '../event/Event';
import { Subscription } from './Subscription';
import {
	PendingSubscription,
	PendingSubscriptionId
} from './PendingSubscription';
import { Column, Entity, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { ContactId } from './ContactId';
import { EventSourceId } from '../event/EventSourceId';

export interface ContactProperties {
	contactId: ContactId;
}

export interface ContactNotification {
	//todo: value object?
	contact: Contact;
	events: Event<EventData, EventSourceId>[];
}

@Entity('contact')
export class Contact extends IdentifiedDomainObject {
	@Column(() => ContactId)
	public readonly contactId: ContactId;

	@OneToMany(() => Subscription, (subscription) => subscription.contact, {
		cascade: true,
		eager: true
	})
	public subscriptions: Subscription[];

	@OneToOne(() => PendingSubscription, {
		cascade: true,
		eager: true
	})
	@JoinColumn()
	public pendingSubscription: PendingSubscription | null;

	private constructor(
		contactId: ContactId,
		subscriptions: Subscription[],
		pendingSubscription: PendingSubscription | null
	) {
		super();
		this.contactId = contactId;
		this.subscriptions = subscriptions;
		this.pendingSubscription = pendingSubscription;
	}

	static create(props: ContactProperties) {
		return new Contact(props.contactId, [], null);
	}

	publishNotificationAbout(
		events: Event<EventData, EventSourceId>[]
	): ContactNotification | null {
		const publishedEvents: Event<EventData, EventSourceId>[] = [];
		events.forEach((event) => {
			const activeSubscription = this.subscriptions.find((subscription) =>
				subscription.isSubscribedTo(event.sourceId)
			);
			if (!activeSubscription) return;
			if (!activeSubscription.isSubscribedTo(event.sourceId)) return;
			if (activeSubscription.isNotificationMutedFor(event)) return;

			activeSubscription.updateEventNotificationState(event);
			publishedEvents.push(event);
		});

		if (publishedEvents.length === 0) return null;

		return {
			contact: this,
			events: publishedEvents
		};
	}

	isSubscribedTo(eventSourceId: EventSourceId) {
		this.subscriptions.some((subscription) =>
			subscription.isSubscribedTo(eventSourceId)
		);
	}

	addSubscription(subscription: Subscription) {
		this.subscriptions.push(subscription);
	}

	addPendingSubscriptions(
		pendingSubscriptionId: PendingSubscriptionId,
		eventSourceIds: EventSourceId[],
		requestDate: Date
	) {
		this.pendingSubscription = new PendingSubscription(
			requestDate,
			pendingSubscriptionId,
			eventSourceIds
		);
	}

	unMuteNotificationFor(eventSourceId: EventSourceId, eventType: string) {
		const subscription = this.subscriptions.find((subscription) =>
			subscription.isSubscribedTo(eventSourceId)
		);
		if (subscription) subscription.unMuteNotificationFor(eventType);
	}
}
