import { Event, EventData } from '../domain/Event';
import { Network } from '@stellarbeat/js-stellar-domain';
import { injectable } from 'inversify';
import { EventRepository } from '../repositories/EventRepository';
import { NetworkEventDetector } from '../domain/services/NetworkEventDetector';
import { Result, ok, err } from 'neverthrow';

/**
 * Because we use repositories/database to detect node and organization events, this is an application service and not a domain service.
 * We could make this a domain service by removing repo access, getting the latest x measurements as params in the detect method and detect the events through code.
 */
@injectable()
export class EventDetector {
	constructor(
		protected eventRepository: EventRepository,
		protected networkEventDetector: NetworkEventDetector
	) {}

	async detect(
		network: Network,
		previousNetwork: Network
	): Promise<Result<Event<EventData>[], Error>> {
		const networkEventsResult = this.networkEventDetector.detect(
			network,
			previousNetwork
		);
		if (networkEventsResult.isErr()) return err(networkEventsResult.error);

		return ok([
			...(await this.eventRepository.findNodeEventsInXLatestNetworkUpdates(3)),
			...(await this.eventRepository.findOrganizationMeasurementEventsInXLatestNetworkUpdates(
				3
			)),
			...networkEventsResult.value
		]);
	}
}
