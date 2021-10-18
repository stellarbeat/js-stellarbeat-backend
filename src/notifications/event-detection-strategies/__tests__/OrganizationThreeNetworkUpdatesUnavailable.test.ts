import NetworkUpdate from '../../../storage/entities/NetworkUpdate';
import { EventType } from '../../Event';
import { OrganizationMeasurementRepository } from '../../../storage/repositories/OrganizationMeasurementRepository';
import { OrganizationThreeNetworkUpdatesUnavailable } from '../OrganizationThreeNetworkUpdatesUnavailable';

const organizationMeasurementRepository =
	new OrganizationMeasurementRepository();
jest
	.spyOn(
		organizationMeasurementRepository,
		'findOrganizationMeasurementEventsInXLatestNetworkUpdates'
	)
	.mockResolvedValue([
		{
			organizationId: 'A',
			subQuorumUnavailable: true
		}
	]);

it('should detect the events for unavailable organizations in the given network update', async function () {
	const detectorStrategy = new OrganizationThreeNetworkUpdatesUnavailable(
		organizationMeasurementRepository
	);

	const events = await detectorStrategy.detect(new NetworkUpdate());
	expect(events).toHaveLength(1);
	expect(
		events.filter(
			(event) =>
				event.type === EventType.OrganizationThreeNetworkUpdatesUnavailable
		)
	).toHaveLength(1);
	expect(events.filter((event) => event.target === 'A')).toHaveLength(1);
});
