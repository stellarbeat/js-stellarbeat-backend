import { Event, MultipleUpdatesEventData } from './Event';
import { OrganizationId, PublicKey } from './EventSourceId';

export interface EventRepository {
	findNodeEventsForXNetworkScans(
		x: number,
		at: Date
	): Promise<Event<MultipleUpdatesEventData, PublicKey>[]>;

	findOrganizationMeasurementEventsForXNetworkScans(
		x: number,
		at: Date
	): Promise<Event<MultipleUpdatesEventData, OrganizationId>[]>;
}
