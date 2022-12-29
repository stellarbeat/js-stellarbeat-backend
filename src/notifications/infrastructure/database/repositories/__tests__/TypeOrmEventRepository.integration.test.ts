import NetworkUpdate from '../../../../../network/domain/NetworkUpdate';
import NodeMeasurement from '../../../../../network/domain/measurement/NodeMeasurement';
import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { TypeOrmNetworkUpdateRepository } from '../../../../../network/infrastructure/database/repositories/TypeOrmNetworkUpdateRepository';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import {
	FullValidatorXUpdatesHistoryArchiveOutOfDateEvent,
	NodeXUpdatesInactiveEvent,
	OrganizationXUpdatesUnavailableEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../../../../domain/event/Event';
import VersionedOrganization, {
	VersionedOrganizationRepository
} from '../../../../../network/domain/VersionedOrganization';
import OrganizationMeasurement from '../../../../../network/domain/measurement/OrganizationMeasurement';
import { EventRepository } from '../../../../domain/event/EventRepository';
import {
	OrganizationId as EventOrganizationId,
	PublicKey as EventPublicKey
} from '../../../../domain/event/EventSourceId';
import { NodeMeasurementRepository } from '../../../../../network/domain/measurement/NodeMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../../../../network/domain/measurement/OrganizationMeasurementRepository';
import { NETWORK_TYPES } from '../../../../../network/infrastructure/di/di-types';
import { createDummyPublicKey } from '../../../../../network/domain/__fixtures__/createDummyPublicKey';
import VersionedNode, {
	VersionedNodeRepository
} from '../../../../../network/domain/VersionedNode';

let container: Container;
let kernel: Kernel;
let networkUpdateRepository: TypeOrmNetworkUpdateRepository;
let nodeMeasurementRepository: NodeMeasurementRepository;
let organizationRepository: VersionedOrganizationRepository;
let organizationMeasurementRepository: OrganizationMeasurementRepository;
let eventRepository: EventRepository;
let versionedNodeRepository: VersionedNodeRepository;
jest.setTimeout(60000); //slow integration tests

beforeEach(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	organizationMeasurementRepository =
		container.get<OrganizationMeasurementRepository>(
			NETWORK_TYPES.OrganizationMeasurementRepository
		);
	organizationRepository = container.get(
		NETWORK_TYPES.VersionedOrganizationRepository
	);
	nodeMeasurementRepository = container.get<NodeMeasurementRepository>(
		NETWORK_TYPES.NodeMeasurementRepository
	);
	versionedNodeRepository = container.get(
		NETWORK_TYPES.VersionedNodeRepository
	);
	networkUpdateRepository = container.get(
		NETWORK_TYPES.NetworkUpdateRepository
	);
	eventRepository = container.get<EventRepository>('EventRepository');
});

afterEach(async () => {
	await kernel.close();
});

it('should fetch node measurement events', async function () {
	const NetworkUpdate1 = new NetworkUpdate(new Date('01-01-2020'));
	NetworkUpdate1.completed = true;
	const NetworkUpdate2 = new NetworkUpdate(new Date('02-01-2020'));
	NetworkUpdate2.completed = true;
	const NetworkUpdate3 = new NetworkUpdate(new Date('03-01-2020'));
	NetworkUpdate3.completed = true;
	const NetworkUpdate4 = new NetworkUpdate(new Date('04-01-2020'));
	NetworkUpdate4.completed = true;
	await networkUpdateRepository.save([
		NetworkUpdate1,
		NetworkUpdate3,
		NetworkUpdate2,
		NetworkUpdate4
	]);

	const nodeA = new VersionedNode(createDummyPublicKey());
	const nodeB = new VersionedNode(createDummyPublicKey());
	const nodeC = new VersionedNode(createDummyPublicKey());
	await versionedNodeRepository.save([nodeA, nodeB, nodeC]);

	const mA1 = new NodeMeasurement(NetworkUpdate1.time, nodeA);
	mA1.isValidating = true;
	mA1.isFullValidator = true;
	const mA2 = new NodeMeasurement(NetworkUpdate2.time, nodeA);
	mA2.isValidating = false;
	const mA3 = new NodeMeasurement(NetworkUpdate3.time, nodeA);
	mA3.isValidating = false;
	const mA4 = new NodeMeasurement(NetworkUpdate4.time, nodeA);
	mA4.isValidating = false;

	//should not detect node that is not validating longer then three NetworkUpdates.
	const mB1 = new NodeMeasurement(NetworkUpdate1.time, nodeB);
	mB1.isValidating = false;
	const mB2 = new NodeMeasurement(NetworkUpdate2.time, nodeB);
	mB2.isValidating = false;
	const mB3 = new NodeMeasurement(NetworkUpdate3.time, nodeB);
	mB3.isValidating = false;
	const mB4 = new NodeMeasurement(NetworkUpdate4.time, nodeB);
	mB4.isValidating = false;

	const mC1 = new NodeMeasurement(NetworkUpdate1.time, nodeC);
	mC1.isValidating = false;
	mC1.isActive = true;
	const mC2 = new NodeMeasurement(NetworkUpdate2.time, nodeC);
	mC2.isValidating = true;
	const mC3 = new NodeMeasurement(NetworkUpdate3.time, nodeC);
	mC3.isValidating = false;
	const mC4 = new NodeMeasurement(NetworkUpdate4.time, nodeC);
	mC4.isValidating = false;

	await nodeMeasurementRepository.save([
		mA1,
		mA2,
		mA3,
		mA4,
		mB1,
		mB2,
		mB3,
		mB4,
		mC1,
		mC2,
		mC3,
		mC4
	]);

	const events = await eventRepository.findNodeEventsForXNetworkUpdates(
		3,
		NetworkUpdate4.time
	);
	expect(events).toHaveLength(3);

	const eventsWithCorrectTimeAndData = events.filter((event) => {
		return (
			event.time.getTime() === new Date('04-01-2020').getTime() &&
			event.data.numberOfUpdates === 3
		);
	});
	expect(eventsWithCorrectTimeAndData).toHaveLength(3);

	const inactiveEvents = events.filter(
		(event) => event instanceof NodeXUpdatesInactiveEvent
	);
	expect(inactiveEvents).toHaveLength(1);

	const inactiveEventsRightTarget = events.filter(
		(event) =>
			event instanceof NodeXUpdatesInactiveEvent &&
			event.sourceId.value === nodeC.publicKey.value &&
			event.sourceId instanceof EventPublicKey
	);
	expect(inactiveEventsRightTarget).toHaveLength(1);

	const notValidatingEvents = events.filter(
		(event) => event instanceof ValidatorXUpdatesNotValidatingEvent
	);
	expect(notValidatingEvents).toHaveLength(1);

	const notValidatingEventsRightTarget = events.filter(
		(event) =>
			event instanceof ValidatorXUpdatesNotValidatingEvent &&
			event.sourceId.value === nodeA.publicKey.value
	);
	expect(notValidatingEventsRightTarget).toHaveLength(1);

	const historyEvents = events.filter(
		(event) =>
			event instanceof FullValidatorXUpdatesHistoryArchiveOutOfDateEvent
	);
	expect(historyEvents).toHaveLength(1);

	const historyEventsRightTarget = events.filter(
		(event) =>
			event instanceof FullValidatorXUpdatesHistoryArchiveOutOfDateEvent &&
			event.sourceId.value === nodeA.publicKey.value
	);
	expect(historyEventsRightTarget).toHaveLength(1);
});

it('should fetch organization events', async function () {
	const NetworkUpdate1 = new NetworkUpdate(new Date('01-01-2020'));
	NetworkUpdate1.completed = true;
	const NetworkUpdate2 = new NetworkUpdate(new Date('02-01-2020'));
	NetworkUpdate2.completed = true;
	const NetworkUpdate3 = new NetworkUpdate(new Date('03-01-2020'));
	NetworkUpdate3.completed = true;
	await networkUpdateRepository.save([
		NetworkUpdate1,
		NetworkUpdate3,
		NetworkUpdate2
	]);

	const organizationId = new VersionedOrganization('A');
	await organizationRepository.save([organizationId]);

	const mA1 = new OrganizationMeasurement(NetworkUpdate1.time, organizationId);
	mA1.isSubQuorumAvailable = true;

	const mA2 = new OrganizationMeasurement(NetworkUpdate2.time, organizationId);
	mA1.isSubQuorumAvailable = true;
	const mA3 = new OrganizationMeasurement(NetworkUpdate3.time, organizationId);
	mA1.isSubQuorumAvailable = true;

	await organizationMeasurementRepository.save([mA1, mA2, mA3]);
	const events =
		await eventRepository.findOrganizationMeasurementEventsForXNetworkUpdates(
			2,
			NetworkUpdate3.time
		);
	expect(events).toHaveLength(1);
	expect(
		events.filter(
			(event) =>
				event instanceof OrganizationXUpdatesUnavailableEvent &&
				event.sourceId instanceof EventOrganizationId &&
				event.sourceId.value === organizationId.organizationId &&
				event.time.getTime() === new Date('03-01-2020').getTime() &&
				event.data.numberOfUpdates === 2
		)
	).toHaveLength(1);
});
