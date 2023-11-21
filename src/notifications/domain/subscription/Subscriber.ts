import { Event, EventData, EventType } from '../event/Event';
import { Subscription } from './Subscription';
import {
	PendingSubscription,
	PendingSubscriptionId
} from './PendingSubscription';
import { Column, Entity, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { UserId } from './UserId';
import { EventSourceId } from '../event/EventSourceId';
import { SubscriberReference } from './SubscriberReference';
import { err, ok, Result } from 'neverthrow';
import { Notification } from './Notification';
import { CoreEntity } from '../../../core/domain/CoreEntity';

export interface SubscriberProperties {
	userId: UserId;
	SubscriberReference: SubscriberReference;
	registrationDate: Date;
}

@Entity('subscription_subscriber')
export class Subscriber extends CoreEntity {
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

	@Column({ type: 'timestamptz', nullable: false })
	public registrationDate: Date;

	private constructor(
		userId: UserId,
		publicReference: SubscriberReference,
		subscriptions: Subscription[],
		pendingSubscription: PendingSubscription | null,
		registrationDate: Date
	) {
		super();
		this.userId = userId;
		this.subscriberReference = publicReference;
		this.subscriptions = subscriptions;
		this.pendingSubscription = pendingSubscription;
		this.registrationDate = registrationDate;
	}

	static create(props: SubscriberProperties) {
		return new Subscriber(
			props.userId,
			props.SubscriberReference,
			[],
			null,
			props.registrationDate
		);
	}

	publishNotificationAbout(
		events: Event<EventData, EventSourceId>[],
		time: Date = new Date()
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
			events: publishedEvents,
			time: time
		};
	}

	confirmPendingSubscription(
		pendingSubscriptionId: PendingSubscriptionId,
		time: Date = new Date()
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
					eventSourceId: eventSourceId,
					subscriptionDate: time
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
		subscription.subscriber = this;
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
