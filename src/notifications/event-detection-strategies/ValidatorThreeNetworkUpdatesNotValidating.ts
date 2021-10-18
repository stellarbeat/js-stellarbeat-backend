import { NodeMeasurementV2Repository } from '../../storage/repositories/NodeMeasurementV2Repository';
import { Event, EventType } from '../Event';
import { NodeMeasurementEventDetectionStrategy } from './NodeMeasurementEventDetectionStrategy';
import { Network } from '@stellarbeat/js-stellar-domain';

export class ValidatorThreeNetworkUpdatesNotValidating extends NodeMeasurementEventDetectionStrategy {
	constructor(nodeMeasurementsRepository: NodeMeasurementV2Repository) {
		super(nodeMeasurementsRepository);
	}

	async detect(network: Network): Promise<Event[]> {
		return this.detectByType(
			network,
			EventType.ValidatorThreeNetworkUpdatesNotValidating,
			'notValidating',
			3
		);
	}
}
