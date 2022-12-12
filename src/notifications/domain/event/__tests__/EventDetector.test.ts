import { mock } from 'jest-mock-extended';
import { EventDetector } from '../EventDetector';
import { EventRepository } from '../EventRepository';
import { NetworkEventDetector } from '../NetworkEventDetector';
import { NodeEventDetector } from '../NodeEventDetector';
import { Network } from '@stellarbeat/js-stellar-domain';
import {
	ChangeEventData,
	Event,
	EventData,
	MultipleUpdatesEventData
} from '../Event';
import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from '../EventSourceId';
import { ok } from 'neverthrow';

it('should return all events', async function () {
	const eventRepository = mock<EventRepository>();
	const networkEventDetector = mock<NetworkEventDetector>();
	const nodeEventDetector = mock<NodeEventDetector>();

	const eventDetector = new EventDetector(
		eventRepository,
		networkEventDetector,
		nodeEventDetector
	);

	eventRepository.findOrganizationMeasurementEventsForXNetworkUpdates.mockResolvedValue(
		['a' as unknown as Event<MultipleUpdatesEventData, OrganizationId>]
	);
	networkEventDetector.detect.mockReturnValue(
		ok(['b' as unknown as Event<EventData, NetworkId>])
	);
	nodeEventDetector.detect.mockResolvedValue([
		'c' as unknown as Event<MultipleUpdatesEventData, PublicKey>
	]);

	const eventsOrError = await eventDetector.detect(
		new Network(),
		new Network()
	);
	if (eventsOrError.isErr()) throw eventsOrError.error;
	expect(eventsOrError.value.sort()).toEqual(['a', 'b', 'c']);
});
