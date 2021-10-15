import { NodeMeasurementV2Repository } from '../../storage/repositories/NodeMeasurementV2Repository';
import NetworkUpdate from '../../storage/entities/NetworkUpdate';
import { Event, EventType } from '../Event';
import { NodeMeasurementEventDetectionStrategy } from './NodeMeasurementEventDetectionStrategy';

export class ValidatorThreeNetworkUpdatesNotValidating extends NodeMeasurementEventDetectionStrategy {
	constructor(nodeMeasurementsRepository: NodeMeasurementV2Repository) {
		super(nodeMeasurementsRepository);
	}

	async detect(networkUpdate: NetworkUpdate): Promise<Event[]> {
		return this.detectByType(
			networkUpdate,
			EventType.ValidatorThreeDaysNotValidating,
			'notValidating',
			3
		);
	}
}
