import { Event, EventData } from './Event';
import { Network } from '@stellarbeat/js-stellar-domain';
import { inject, injectable } from 'inversify';
import { NetworkEventDetector } from './NetworkEventDetector';
import { Result, ok, err } from 'neverthrow';
import { EventRepository } from './EventRepository';
import { EventSourceId } from './EventSourceId';
import { NodeEventDetector } from './NodeEventDetector';

@injectable()
export class EventDetector {
	constructor(
		@inject('EventRepository') private eventRepository: EventRepository,
		private networkEventDetector: NetworkEventDetector,
		private nodeEventDetector: NodeEventDetector
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
			...(await this.nodeEventDetector.detect(
				network.time,
				network.nodes,
				previousNetwork.nodes
			)),
			...(await this.eventRepository.findOrganizationMeasurementEventsForXNetworkUpdates(
				3,
				network.time
			)),
			...networkEventsResult.value
		]);
	}
}
