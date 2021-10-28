import { Event, MultipleUpdatesEventData } from './Event';

export interface EventRepository {
	findNodeEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData>[]>;

	findOrganizationMeasurementEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData>[]>;
}
