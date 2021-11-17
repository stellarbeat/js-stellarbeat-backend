import { Event, EventData, EventType } from '../event/Event';
import { Subscription } from './Subscription';
import {
	PendingSubscription,
	PendingSubscriptionId
} from './PendingSubscription';
import { Column, Entity, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { UserId } from './UserId';
import { EventSourceId } from '../event/EventSourceId';
import { SubscriberReference } from './SubscriberReference';
import { err, ok, Result } from 'neverthrow';

export interface SubscriberProperties {
	userId: UserId;
	SubscriberReference: SubscriberReference;
}

export interface Notification {
	//todo: value object?
	subscriber: Subscriber;
	events: Event<EventData, EventSourceId>[];
}

@Entity('subscription_subscriber')
export class Subscriber extends IdentifiedDomainObject {
	@Column(() => UserId)
	public readonly userId: UserId;

	@Column(() => SubscriberReference)
	public readonly subscriberReference: SubscriberReference; //can be exposed to the outside world without harm

	@OneToMany(() => Subscription, (subscription) => subscription.subscriber, {
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
		userId: UserId,
		publicReference: SubscriberReference,
		subscriptions: Subscription[],
		pendingSubscription: PendingSubscription | null
	) {
		super();
		this.userId = userId;
		this.subscriberReference = publicReference;
		this.subscriptions = subscriptions;
		this.pendingSubscription = pendingSubscription;
	}

	static create(props: SubscriberProperties) {
		return new Subscriber(props.userId, props.SubscriberReference, [], null);
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
			subscriber: this,
			events: publishedEvents
		};
	}

	confirmPendingSubscription(
		pendingSubscriptionId: PendingSubscriptionId
	): Result<void, Error> {
		if (!this.pendingSubscription)
			return err(new Error('no pending subscription found'));

		if (
			!this.pendingSubscription.pendingSubscriptionId.equals(
				pendingSubscriptionId
			)
		)
			return err(new Error('wrong pending subscription id'));

		this.subscriptions = [];
		this.pendingSubscription.eventSourceIds.forEach((eventSourceId) => {
			this.addSubscription(
				Subscription.create({
					eventSourceId: eventSourceId
				})
			);
		});
		this.pendingSubscription = null;

		return ok(undefined);
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