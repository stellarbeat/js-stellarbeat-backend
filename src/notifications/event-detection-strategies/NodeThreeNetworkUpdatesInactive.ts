import { NodeMeasurementV2Repository } from '../../storage/repositories/NodeMeasurementV2Repository';
import { Event, EventType } from '../Event';
import { NodeMeasurementEventDetectionStrategy } from './NodeMeasurementEventDetectionStrategy';
import { Network } from '@stellarbeat/js-stellar-domain';

export class NodeThreeNetworkUpdatesInactive extends NodeMeasurementEventDetectionStrategy {
	constructor(nodeMeasurementsRepository: NodeMeasurementV2Repository) {
		super(nodeMeasurementsRepository);
	}

	detect(network: Network): Promise<Event[]> {
		return this.detectByType(
			network,
			EventType.NodeThreeNetworkUpdatesInactive,
			'inactive',
			3
		);
	}
}
