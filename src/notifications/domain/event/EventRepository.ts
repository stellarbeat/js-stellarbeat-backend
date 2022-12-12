import { Event, MultipleUpdatesEventData } from './Event';
import { OrganizationId, PublicKey } from './EventSourceId';

export interface EventRepository {
	findNodeEventsForXNetworkUpdates(
		x: number,
		at: Date
	): Promise<Event<MultipleUpdatesEventData, PublicKey>[]>;

	findOrganizationMeasurementEventsForXNetworkUpdates(
		x: number,
		at: Date
	): Promise<Event<MultipleUpdatesEventData, OrganizationId>[]>;
}
