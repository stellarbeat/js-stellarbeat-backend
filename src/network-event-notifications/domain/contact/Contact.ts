import { Event, EventData, SourceType } from '../event/Event';
import { EventSubscription } from '../event-subscription/EventSubscription';
import { PendingEventSubscription } from '../event-subscription/PendingEventSubscription';
import { LatestNotification } from '../event-subscription/LatestNotification';
import { Column, Entity, OneToMany } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { ContactId } from './ContactId';

export interface ContactProperties {
	contactId: ContactId;
	mailHash: string;
	subscriptions: EventSubscription[];
	pendingSubscription?: PendingEventSubscription;
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

	notifyIfSubscribed(events: Event<EventData>[]) {
		events.forEach((event) => this.notifyOfSingleEventIfSubscribed(event));
	}

	notifyOfSingleEventIfSubscribed(event: Event<EventData>) {
		this.eventSubscriptions.forEach((subscription) =>
			subscription.notifyIfSubscribed(event)
		);
	}

	getNotificationsAt(time: Date): LatestNotification[] {
		return this.eventSubscriptions
			.map((subscription) => subscription.getNotificationsAt(time))
			.flat();
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
