import { Event, EventData } from './Event';
import { Network } from '@stellarbeat/js-stellar-domain';
import { injectable } from 'inversify';
import { EventRepository } from '../storage/repositories/EventRepository';
import { NetworkEventDetector } from './NetworkEventDetector';
import { Result, ok, err } from 'neverthrow';
import NetworkService from '../services/NetworkService';
import { CustomError } from '../errors/CustomError';

@injectable()
export class EventDetector {
	constructor(
		protected eventRepository: EventRepository,
		protected networkEventDetector: NetworkEventDetector,
		protected networkService: NetworkService
	) {
		this.eventRepository = eventRepository;
		this.networkEventDetector = networkEventDetector;
	}

	async detect(network: Network): Promise<Result<Event<EventData>[], Error>> {
		const previousNetworkResult = await this.networkService.getPreviousNetwork(
			network.time
		); //todo: could be moved up and given as param?
		if (previousNetworkResult.isErr()) {
			return err(
				new CustomError(
					'Network events not detected because invalid previous network',
					'NetworkEventDetectionStrategyError',
					previousNetworkResult.error
				)
			);
		}

		const previousNetwork = previousNetworkResult.value;
		if (!previousNetwork) {
			//no previous network? no notifications...
			return ok([]);
		}

		return ok([
			...(await this.eventRepository.findNodeEventsInXLatestNetworkUpdates(3)),
			...(await this.eventRepository.findOrganizationMeasurementEventsInXLatestNetworkUpdates(
				3
			)),
			...(await this.networkEventDetector.detect(network, previousNetwork))
		]);
	}
}
