export class SubscribeToEventsDTO {
	constructor(
		public subscriptionDate: Date,
		public emailAddress: string,
		public eventSources: { type: string; id: string }[]
	) {}
}
