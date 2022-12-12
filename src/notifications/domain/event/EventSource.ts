import { EventSourceId } from './EventSourceId';

export class EventSource {
	constructor(
		public readonly eventSourceId: EventSourceId,
		public readonly name: string
	) {}
}
