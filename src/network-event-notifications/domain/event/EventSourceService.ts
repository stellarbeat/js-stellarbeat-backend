import { Result } from 'neverthrow';
import { EventSourceId } from './EventSourceId';
import { EventSource } from './EventSource';

export interface EventSourceService {
	isEventSourceIdKnown(
		eventSourceId: EventSourceId,
		time: Date
	): Promise<Result<boolean, Error>>;

	findEventSource(
		eventSourceId: EventSourceId,
		time: Date
	): Promise<Result<EventSource, Error>>;
}
