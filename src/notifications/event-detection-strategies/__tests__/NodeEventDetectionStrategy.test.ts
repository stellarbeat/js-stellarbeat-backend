import { NodeMeasurementV2Repository } from '../../../storage/repositories/NodeMeasurementV2Repository';
import { EventType } from '../../Event';
import { Network } from '@stellarbeat/js-stellar-domain';
import { NodeEventDetectionStrategy } from '../NodeEventDetectionStrategy';

const nodeMeasurementRepository = new NodeMeasurementV2Repository();
const detectorStrategy = new NodeEventDetectionStrategy(
	nodeMeasurementRepository
);
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
	let events = await detectorStrategy.detect(new Network());
	events = events.filter(
		(event) => event.type === EventType.NodeThreeNetworkUpdatesInactive
	);
	expect(events).toHaveLength(2);
	expect(events.filter((event) => event.target === 'A')).toHaveLength(1);
	expect(events.filter((event) => event.target === 'D')).toHaveLength(1);
});

it('should detect if a full validator history archive is out of date for three consecutive network updates', async function () {
	let events = await detectorStrategy.detect(new Network());
	events = events.filter(
		(event) =>
			event.type ===
			EventType.FullValidatorHistoryArchiveThreeNetworkUpdatesOutOfDate
	);
	expect(events).toHaveLength(1);
	expect(events.filter((event) => event.target === 'B')).toHaveLength(1);
});

it('should detect if a validator is not validating for three consecutive network updates', async function () {
	let events = await detectorStrategy.detect(new Network());
	events = events.filter(
		(event) =>
			event.type === EventType.ValidatorThreeNetworkUpdatesNotValidating
	);
	expect(events).toHaveLength(2);
	expect(events.filter((event) => event.target === 'C')).toHaveLength(1);
	expect(events.filter((event) => event.target === 'D')).toHaveLength(1);
});
