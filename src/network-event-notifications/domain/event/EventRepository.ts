import { Event, MultipleUpdatesEventData } from './Event';
import { EventSource, OrganizationId, PublicKey } from '../contact/EventSource';

export interface EventRepository {
	findNodeEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData, EventSource<PublicKey>>[]>;

	findOrganizationMeasurementEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData, EventSource<OrganizationId>>[]>;
}
