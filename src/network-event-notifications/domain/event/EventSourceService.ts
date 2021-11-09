import { Result } from 'neverthrow';
import { EventSourceId } from './EventSourceId';

export interface EventSourceService {
	isEventSourceIdKnown(
		eventSourceId: EventSourceId,
		time: Date
	): Promise<Result<boolean, Error>>;
}
