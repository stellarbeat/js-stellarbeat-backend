import {
	NodeMeasurementEventResult,
	NodeMeasurementV2Repository
} from '../../storage/repositories/NodeMeasurementV2Repository';
import { Event, EventType } from '../Event';
import { EventDetectionStrategy } from '../EventDetectionStrategy';
import { Network } from '@stellarbeat/js-stellar-domain';

export class NodeEventDetectionStrategy implements EventDetectionStrategy {
	constructor(
		protected nodeMeasurementsRepository: NodeMeasurementV2Repository
	) {
		this.nodeMeasurementsRepository = nodeMeasurementsRepository;
	}

	async detect(network: Network): Promise<Event[]> {
		const measurementEvents =
			await this.nodeMeasurementsRepository.findNodeMeasurementEventsInXLatestNetworkUpdates(
				3 //todo config param?
			);

		return [
			...(await this.detectHistoryArchiveEvents(network, measurementEvents)),
			...(await this.detectInActiveEvents(network, measurementEvents)),
			...(await this.detectNotValidatingEvents(network, measurementEvents))
		];
	}

	protected async detectHistoryArchiveEvents(
		network: Network,
		nodeMeasurementEventResults: NodeMeasurementEventResult[]
	): Promise<Event[]> {
		return nodeMeasurementEventResults
			.filter((result) => result['historyOutOfDate'])
			.map(
				(node) =>
					new Event(
						network.time,
						EventType.FullValidatorHistoryArchiveThreeNetworkUpdatesOutOfDate,
						node.publicKey
					)
			);
	}

	protected async detectNotValidatingEvents(
		network: Network,
		nodeMeasurementEventResults: NodeMeasurementEventResult[]
	): Promise<Event[]> {
		return nodeMeasurementEventResults
			.filter((result) => result['notValidating'])
			.map(
				(node) =>
					new Event(
						network.time,
						EventType.ValidatorThreeNetworkUpdatesNotValidating,
						node.publicKey
					)
			);
	}

	protected async detectInActiveEvents(
		network: Network,
		nodeMeasurementEventResults: NodeMeasurementEventResult[]
	): Promise<Event[]> {
		return nodeMeasurementEventResults
			.filter((result) => result['inactive'])
			.map(
				(node) =>
					new Event(
						network.time,
						EventType.NodeThreeNetworkUpdatesInactive,
						node.publicKey
					)
			);
	}
}
