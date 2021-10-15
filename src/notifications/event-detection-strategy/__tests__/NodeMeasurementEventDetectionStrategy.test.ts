import { NodeMeasurementV2Repository } from '../../../storage/repositories/NodeMeasurementV2Repository';
import NetworkUpdate from '../../../storage/entities/NetworkUpdate';
import { EventType } from '../../Event';
import { NodeThreeNetworkUpdatesInactive } from '../NodeThreeNetworkUpdatesInactive';
import { ValidatorThreeNetworkUpdatesNotValidating } from '../ValidatorThreeNetworkUpdatesNotValidating';
import { FullValidatorThreeNetworkUpdatesHistoryArchivesOutOfDate } from '../FullValidatorThreeNetworkUpdatesHistoryArchivesOutOfDate';

const nodeMeasurementRepository = new NodeMeasurementV2Repository();
jest
	.spyOn(
		nodeMeasurementRepository,
		'findNodeMeasurementEventsInXLatestNetworkUpdates'
	)
	.mockResolvedValue([
		{
			publicKey: 'A',
			inactive: true,
			notValidating: false,
			historyOutOfDate: false
		},
		{
			publicKey: 'B',
			inactive: false,
			notValidating: false,
			historyOutOfDate: true
		},
		{
			publicKey: 'C',
			inactive: false,
			notValidating: true,
			historyOutOfDate: false
		},
		{
			publicKey: 'D',
			inactive: true,
			notValidating: true,
			historyOutOfDate: false
		}
	]);

it('should detect the events for inactive nodes in the given network update', async function () {
	const detectorStrategy = new NodeThreeNetworkUpdatesInactive(
		nodeMeasurementRepository
	);

	const events = await detectorStrategy.detect(new NetworkUpdate());
	expect(events).toHaveLength(2);
	expect(
		events.filter((event) => event.type === EventType.NodeThreeCrawlsInactive)
	).toHaveLength(2);
	expect(events.filter((event) => event.target === 'A')).toHaveLength(1);
	expect(events.filter((event) => event.target === 'D')).toHaveLength(1);
});

it('should detect if a full validator history archive is out of date for three consecutive network updates', async function () {
	const detectorStrategy =
		new FullValidatorThreeNetworkUpdatesHistoryArchivesOutOfDate(
			nodeMeasurementRepository
		);

	const events = await detectorStrategy.detect(new NetworkUpdate());
	expect(events).toHaveLength(1);
	expect(
		events.filter(
			(event) =>
				event.type === EventType.FullValidatorHistoryArchiveThreeCrawlsOutOfDate
		)
	).toHaveLength(1);
	expect(events.filter((event) => event.target === 'B')).toHaveLength(1);
});

it('should detect if a validator is not validating for three consecutive network updates', async function () {
	const detectorStrategy = new ValidatorThreeNetworkUpdatesNotValidating(
		nodeMeasurementRepository
	);

	const events = await detectorStrategy.detect(new NetworkUpdate());
	expect(events).toHaveLength(2);
	expect(
		events.filter(
			(event) => event.type === EventType.ValidatorThreeDaysNotValidating
		)
	).toHaveLength(2);
	expect(events.filter((event) => event.target === 'C')).toHaveLength(1);
	expect(events.filter((event) => event.target === 'D')).toHaveLength(1);
});
