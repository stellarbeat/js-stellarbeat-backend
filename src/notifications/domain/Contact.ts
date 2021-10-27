import { Event, EventData, SourceType } from './Event';
import { EventSubscription } from './event-subscription/EventSubscription';
import { PendingEventSubscription } from './event-subscription/PendingEventSubscription';
import { LatestNotification } from './event-subscription/LatestNotification';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export interface ContactProperties {
	mail: string;
	subscriptions: EventSubscription[];
	pendingSubscription?: PendingEventSubscription;
}

@Entity('contact')
export class Contact {
	@PrimaryGeneratedColumn()
	public id?: number;

	@Column({ type: 'text', nullable: false })
	public readonly mail: string;

	@OneToMany(
		() => EventSubscription,
		(eventSubscription) => eventSubscription.contact,
		{ cascade: true, eager: true }
	)
	public eventSubscriptions: EventSubscription[];

	public pendingSubscription?: PendingEventSubscription;

	private constructor(
		mail: string,
		subscriptions: EventSubscription[],
		pendingSubscription?: PendingEventSubscription,
		id?: number
	) {
		this.mail = mail;
		this.eventSubscriptions = subscriptions;
		this.pendingSubscription = pendingSubscription;
		this.id = id;
	}

	static create(props: ContactProperties, id?: number) {
		return new Contact(
			props.mail,
			props.subscriptions,
			props.pendingSubscription,
			id
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
