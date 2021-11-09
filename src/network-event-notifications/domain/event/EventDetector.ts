import { Event, EventData } from './Event';
import { Network } from '@stellarbeat/js-stellar-domain';
import { inject, injectable } from 'inversify';
import { NetworkEventDetector } from './NetworkEventDetector';
import { Result, ok, err } from 'neverthrow';
import { EventRepository } from './EventRepository';
import { EventSourceId } from './EventSourceId';

@injectable()
export class EventDetector {
	constructor(
		@inject('EventRepository') protected eventRepository: EventRepository,
		protected networkEventDetector: NetworkEventDetector
	) {}

	async detect(
		network: Network,
		previousNetwork: Network
	): Promise<Result<Event<EventData, EventSourceId>[], Error>> {
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
