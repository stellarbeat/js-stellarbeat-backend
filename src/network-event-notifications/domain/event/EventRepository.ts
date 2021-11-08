import { Event, MultipleUpdatesEventData } from './Event';
import { OrganizationId, PublicKey } from '../contact/EventSourceId';

export interface EventRepository {
	findNodeEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData, PublicKey>[]>;

	findOrganizationMeasurementEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData, OrganizationId>[]>;
}
