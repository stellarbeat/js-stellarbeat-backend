type eventSourceType = 'node' | 'organization' | 'network';
export class SubscribeToEventSourcesDTO {
	constructor(
		public subscriptionDate: Date,
		public emailAddress: string,
		public eventSources: { type: eventSourceType; id: string }[]
	) {}
}
