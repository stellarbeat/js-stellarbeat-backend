import {
	NodeMeasurementEventResult,
	NodeMeasurementV2Repository
} from '../../storage/repositories/NodeMeasurementV2Repository';
import NetworkUpdate from '../../storage/entities/NetworkUpdate';
import { Event, EventType } from '../Event';
import { EventDetectionStrategy } from '../EventDetectionStrategy';

export abstract class NodeMeasurementEventDetectionStrategy
	implements EventDetectionStrategy
{
	protected constructor(
		protected nodeMeasurementsRepository: NodeMeasurementV2Repository
	) {
		this.nodeMeasurementsRepository = nodeMeasurementsRepository;
	}

	abstract detect(networkUpdate: NetworkUpdate): Promise<Event[]>;

	async detectByType(
		networkUpdate: NetworkUpdate,
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
			.map((node) => new Event(networkUpdate.time, eventType, node.publicKey));
	}
}
