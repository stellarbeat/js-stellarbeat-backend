import { Event, EventData, SourceType } from '../event/Event';
import { EventSubscription } from './EventSubscription';
import { PendingEventSubscription } from './PendingEventSubscription';
import { Column, Entity, OneToMany } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { ContactId } from './ContactId';

export interface ContactProperties {
	contactId: ContactId;
	mailHash: string;
	subscriptions: EventSubscription[];
	pendingSubscription?: PendingEventSubscription;
}

export interface ContactNotification {
	//todo: value object?
	contact: Contact;
	events: Event<EventData>[];
}

@Entity('contact')
export class Contact extends IdentifiedDomainObject {
	@Column({ type: 'text', nullable: false })
	public readonly mailHash: string;

	@Column(() => ContactId)
	public readonly contactId: ContactId;

	@OneToMany(
		() => EventSubscription,
		(eventSubscription) => eventSubscription.contact,
		{ cascade: true, eager: true }
	)
	public eventSubscriptions: EventSubscription[];

	public pendingSubscription?: PendingEventSubscription;

	private constructor(
		contactId: ContactId,
		mailHash: string,
		subscriptions: EventSubscription[],
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
		events: Event<EventData>[]
	): ContactNotification | null {
		const publishedEvents: Event<EventData>[] = [];
		events.forEach((event) => {
			const activeSubscription = this.eventSubscriptions.find((subscription) =>
				subscription.isSubscribedTo(event.source.id, event.source.type)
			);
			if (!activeSubscription) return;
			if (
				!activeSubscription.isSubscribedTo(event.source.id, event.source.type)
			)
				return;
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

	isSubscribedTo(sourceId: string, sourceType: SourceType) {
		this.eventSubscriptions.some((subscription) =>
			subscription.isSubscribedTo(sourceId, sourceType)
		);
	}

	addSubscription(subscription: EventSubscription) {
		this.eventSubscriptions.push(subscription);
	}
}
