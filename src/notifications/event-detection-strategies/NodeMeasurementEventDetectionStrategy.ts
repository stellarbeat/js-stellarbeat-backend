import {
	NodeMeasurementEventResult,
	NodeMeasurementV2Repository
} from '../../storage/repositories/NodeMeasurementV2Repository';
import { Event, EventType } from '../Event';
import { EventDetectionStrategy } from '../EventDetectionStrategy';
import { Network } from '@stellarbeat/js-stellar-domain';

export abstract class NodeMeasurementEventDetectionStrategy
	implements EventDetectionStrategy
{
	protected constructor(
		protected nodeMeasurementsRepository: NodeMeasurementV2Repository
	) {
		this.nodeMeasurementsRepository = nodeMeasurementsRepository;
	}

	abstract detect(network: Network): Promise<Event[]>;

	async detectByType(
		network: Network,
		eventType: EventType,
		nodeMeasurementProperty: keyof NodeMeasurementEventResult,
		threshold: number
	): Promise<Event[]> {
		const inactiveNodes =
			await this.nodeMeasurementsRepository.findNodeMeasurementEventsInXLatestNetworkUpdates(
				threshold
			);

		return inactiveNodes
			.filter((result) => result[nodeMeasurementProperty])
			.map((node) => new Event(network.time, eventType, node.publicKey));
	}
}
