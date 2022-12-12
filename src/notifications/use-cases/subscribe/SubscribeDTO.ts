export interface EventSourceIdDTO {
	type: 'node' | 'organization' | 'network';
	id: string;
}
export class SubscribeDTO {
	constructor(
		public readonly emailAddress: string,
		public readonly eventSourceIds: EventSourceIdDTO[],
		public readonly time: Date
	) {}
}
