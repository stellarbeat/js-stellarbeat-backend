export interface EventSourceIdDTO {
	type: 'node' | 'organization' | 'network';
	id: string;
}
export class RequestUnsubscribeLinkDTO {
	constructor(
		public readonly emailAddress: string,
		public readonly time: Date
	) {}
}
