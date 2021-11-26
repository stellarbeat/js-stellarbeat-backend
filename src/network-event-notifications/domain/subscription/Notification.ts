import { Event, EventData } from '../event/Event';
import { EventSourceId } from '../event/EventSourceId';
import { Subscriber } from './Subscriber';

export interface Notification {
	subscriber: Subscriber;
	events: Event<EventData, EventSourceId>[];
	time: Date;
}
