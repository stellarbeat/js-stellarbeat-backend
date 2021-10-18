import { Event, EventType } from '../Event';
import { OrganizationMeasurementRepository } from '../../storage/repositories/OrganizationMeasurementRepository';
import { EventDetectionStrategy } from '../EventDetectionStrategy';
import { Network } from '@stellarbeat/js-stellar-domain';

export class OrganizationThreeNetworkUpdatesUnavailable
	implements EventDetectionStrategy
{
	constructor(
		protected organizationMeasurementsRepository: OrganizationMeasurementRepository
	) {
		this.organizationMeasurementsRepository =
			organizationMeasurementsRepository;
	}

	async detect(network: Network): Promise<Event[]> {
		const events =
			await this.organizationMeasurementsRepository.findOrganizationMeasurementEventsInXLatestNetworkUpdates(
				3
			);
		return events.map(
			(event) =>
				new Event(
					network.time,
					EventType.OrganizationThreeNetworkUpdatesUnavailable,
					event.organizationId
				)
		);
	}
}
