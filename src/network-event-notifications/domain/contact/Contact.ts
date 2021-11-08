import { Event, EventData } from '../event/Event';
import { EventSourceSubscription } from './EventSourceSubscription';
import { PendingEventSubscription } from './PendingEventSubscription';
import { Column, Entity, OneToMany } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { ContactId } from './ContactId';
import { EventSourceId } from './EventSourceId';

export interface ContactProperties {
	contactId: ContactId;
	mailHash: string;
	subscriptions: EventSourceSubscription[];
	pendingSubscription?: PendingEventSubscription;
}

export interface ContactNotification {
	//todo: value object?
	contact: Contact;
	events: Event<EventData, EventSourceId>[];
}

@Entity('contact')
export class Contact extends IdentifiedDomainObject {
	@Column({ type: 'text', nullable: false })
	public readonly mailHash: string;

	@Column(() => ContactId)
	public readonly contactId: ContactId;

	@OneToMany(
		() => EventSourceSubscription,
		(eventSubscription) => eventSubscription.contact,
		{ cascade: true, eager: true }
	)
	public eventSubscriptions: EventSourceSubscription[];

	public pendingSubscription?: PendingEventSubscription;

	private constructor(
		contactId: ContactId,
		mailHash: string,
		subscriptions: EventSourceSubscription[],
		pendingSubscription?: PendingEventSubscription
	) {
		super();
		this.contactId = contactId;
		this.mailHash = mailHash;
		this.eventSubscriptions = subscriptions;
		this.pendingSubscription = pendingSubscription;
	}

	static create(props: ContactProperties) {
		return new Contact(
			props.contactId,
			props.mailHash,
			props.subscriptions,
			props.pendingSubscription
		);
	}

	publishNotificationAbout(
		events: Event<EventData, EventSourceId>[]
	): ContactNotification | null {
		const publishedEvents: Event<EventData, EventSourceId>[] = [];
		events.forEach((event) => {
			const activeSubscription = this.eventSubscriptions.find((subscription) =>
				subscription.isSubscribedTo(event.sourceId)
			);
			if (!activeSubscription) return;
			if (!activeSubscription.isSubscribedTo(event.sourceId)) return;
			if (activeSubscription.eventInCoolOffPeriod(event)) return;

			activeSubscription.addOrUpdateLatestNotificationFor(event);
			publishedEvents.push(event);
		});

		if (publishedEvents.length === 0) return null;

		return {
			contact: this,
			events: publishedEvents
		};
	}

	isSubscribedTo(eventSourceId: EventSourceId) {
		this.eventSubscriptions.some((subscription) =>
			subscription.isSubscribedTo(eventSourceId)
		);
	}

	addSubscription(subscription: EventSourceSubscription) {
		this.eventSubscriptions.push(subscription);
	}
}
