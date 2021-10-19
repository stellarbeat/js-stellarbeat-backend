import { EventType } from '../../Event';
import { OrganizationMeasurementRepository } from '../../../storage/repositories/OrganizationMeasurementRepository';
import { OrganizationEventDetectionStrategy } from '../OrganizationEventDetectionStrategy';
import { Network } from '@stellarbeat/js-stellar-domain';

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
	const detectorStrategy = new OrganizationEventDetectionStrategy(
		organizationMeasurementRepository
	);

	const events = await detectorStrategy.detect(new Network());
	expect(events).toHaveLength(1);
	expect(
		events.filter(
			(event) =>
				event.type === EventType.OrganizationThreeNetworkUpdatesUnavailable
		)
	).toHaveLength(1);
	expect(events.filter((event) => event.target === 'A')).toHaveLength(1);
});
