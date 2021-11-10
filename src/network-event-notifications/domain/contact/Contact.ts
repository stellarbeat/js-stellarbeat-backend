import { Event, EventData, EventType } from '../event/Event';
import { Subscription } from './Subscription';
import {
	PendingSubscription,
	PendingSubscriptionId
} from './PendingSubscription';
import { Column, Entity, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { ContactId } from './ContactId';
import { EventSourceId } from '../event/EventSourceId';
import { ContactPublicReference } from './ContactPublicReference';

export interface ContactProperties {
	contactId: ContactId;
}

export interface Notification {
	//todo: value object?
	contact: Contact;
	events: Event<EventData, EventSourceId>[];
}

@Entity('contact')
export class Contact extends IdentifiedDomainObject {
	@Column(() => ContactId)
	public readonly contactId: ContactId;

	@Column(() => ContactPublicReference)
	public readonly publicReference: ContactPublicReference; //can be exposed to the outside world without harm

	@OneToMany(() => Subscription, (subscription) => subscription.contact, {
		cascade: true,
		eager: true
	})
	protected subscriptions: Subscription[];

	@OneToOne(() => PendingSubscription, {
		cascade: true,
		eager: true
	})
	@JoinColumn()
	public pendingSubscription: PendingSubscription | null;

	private constructor(
		contactId: ContactId,
		publicReference: ContactPublicReference,
		subscriptions: Subscription[],
		pendingSubscription: PendingSubscription | null
	) {
		super();
		this.contactId = contactId;
		this.publicReference = publicReference;
		this.subscriptions = subscriptions;
		this.pendingSubscription = pendingSubscription;
	}

	static create(props: ContactProperties) {
		return new Contact(
			props.contactId,
			ContactPublicReference.create(),
			[],
			null
		);
	}

	publishNotificationAbout(
		events: Event<EventData, EventSourceId>[]
	): Notification | null {
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

	confirmPendingSubscription(pendingSubscriptionId: PendingSubscriptionId) {
		if (!this.pendingSubscription) return;

		if (
			!this.pendingSubscription.pendingSubscriptionId.equals(
				pendingSubscriptionId
			)
		)
			return;

		this.subscriptions = [];
		this.pendingSubscription.eventSourceIds.forEach((eventSourceId) => {
			this.addSubscription(
				Subscription.create({
					eventSourceId: eventSourceId
				})
			);
		});
		this.pendingSubscription = null;
	}

	isSubscribedTo(eventSourceId: EventSourceId) {
		return this.subscriptions.some((subscription) =>
			subscription.isSubscribedTo(eventSourceId)
		);
	}

	hasSubscriptions() {
		return this.subscriptions.length !== 0;
	}

	protected addSubscription(subscription: Subscription) {
		this.subscriptions.push(subscription);
	}

	addPendingSubscription(
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

	unMuteNotificationFor(eventSourceId: EventSourceId, eventType: EventType) {
		const subscription = this.subscriptions.find((subscription) =>
			subscription.isSubscribedTo(eventSourceId)
		);
		if (subscription) subscription.unMuteNotificationFor(eventType);
	}
}
