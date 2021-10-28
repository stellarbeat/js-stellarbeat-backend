import { Event, MultipleUpdatesEventData } from './Event';

export interface IEventRepository {
	findNodeEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData>[]>;

	findOrganizationMeasurementEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData>[]>;
}
