import NetworkUpdate from '../../storage/entities/NetworkUpdate';
import { Event, EventType } from '../Event';
import { OrganizationMeasurementRepository } from '../../storage/repositories/OrganizationMeasurementRepository';
import { EventDetectionStrategy } from '../EventDetectionStrategy';

export class OrganizationThreeNetworkUpdatesUnavailable
	implements EventDetectionStrategy
{
	constructor(
		protected organizationMeasurementsRepository: OrganizationMeasurementRepository
	) {
		this.organizationMeasurementsRepository =
			organizationMeasurementsRepository;
	}

	async detect(networkUpdate: NetworkUpdate): Promise<Event[]> {
		const events =
			await this.organizationMeasurementsRepository.findOrganizationMeasurementEventsInXLatestNetworkUpdates(
				3
			);
		return events.map(
			(event) =>
				new Event(
					networkUpdate.time,
					EventType.OrganizationThreeNetworkUpdatesUnavailable,
					event.organizationId
				)
		);
	}
}
