import NetworkUpdate from '../../../../../network/domain/NetworkUpdate';
import { PublicKeyRepository } from '../../../../../network/domain/PublicKey';
import NodeMeasurement from '../../../../../network/domain/measurement/NodeMeasurement';
import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { NetworkUpdateRepository } from '../../../../../network/infrastructure/database/repositories/NetworkUpdateRepository';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import {
	FullValidatorXUpdatesHistoryArchiveOutOfDateEvent,
	NodeXUpdatesInactiveEvent,
	OrganizationXUpdatesUnavailableEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../../../../domain/event/Event';
import OrganizationId, {
	OrganizationIdRepository
} from '../../../../../network/domain/OrganizationId';
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

let container: Container;
let kernel: Kernel;
let networkUpdateRepository: NetworkUpdateRepository;
let nodeMeasurementRepository: NodeMeasurementRepository;
let organizationIdRepository: OrganizationIdRepository;
let organizationMeasurementRepository: OrganizationMeasurementRepository;
let eventRepository: EventRepository;
let nodePublicKeyStorageRepository: PublicKeyRepository;
jest.setTimeout(60000); //slow integration tests

beforeEach(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	organizationMeasurementRepository =
		container.get<OrganizationMeasurementRepository>(
			NETWORK_TYPES.OrganizationMeasurementRepository
		);
	organizationIdRepository = container.get('OrganizationIdStorageRepository');
	nodeMeasurementRepository = container.get<NodeMeasurementRepository>(
		NETWORK_TYPES.NodeMeasurementRepository
	);
	nodePublicKeyStorageRepository = container.get(
		'NodePublicKeyStorageRepository'
	);
	networkUpdateRepository = container.get(NetworkUpdateRepository);
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

	const nodePublicKeyStorageA = createDummyPublicKey();
	const nodePublicKeyStorageB = createDummyPublicKey();
	const nodePublicKeyStorageC = createDummyPublicKey();
	await nodePublicKeyStorageRepository.save([
		nodePublicKeyStorageA,
		nodePublicKeyStorageB,
		nodePublicKeyStorageC
	]);

	const mA1 = new NodeMeasurement(NetworkUpdate1.time, nodePublicKeyStorageA);
	mA1.isValidating = true;
	mA1.isFullValidator = true;
	const mA2 = new NodeMeasurement(NetworkUpdate2.time, nodePublicKeyStorageA);
	mA2.isValidating = false;
	const mA3 = new NodeMeasurement(NetworkUpdate3.time, nodePublicKeyStorageA);
	mA3.isValidating = false;
	const mA4 = new NodeMeasurement(NetworkUpdate4.time, nodePublicKeyStorageA);
	mA4.isValidating = false;

	//should not detect node that is not validating longer then three NetworkUpdates.
	const mB1 = new NodeMeasurement(NetworkUpdate1.time, nodePublicKeyStorageB);
	mB1.isValidating = false;
	const mB2 = new NodeMeasurement(NetworkUpdate2.time, nodePublicKeyStorageB);
	mB2.isValidating = false;
	const mB3 = new NodeMeasurement(NetworkUpdate3.time, nodePublicKeyStorageB);
	mB3.isValidating = false;
	const mB4 = new NodeMeasurement(NetworkUpdate4.time, nodePublicKeyStorageB);
	mB4.isValidating = false;

	const mC1 = new NodeMeasurement(NetworkUpdate1.time, nodePublicKeyStorageC);
	mC1.isValidating = false;
	mC1.isActive = true;
	const mC2 = new NodeMeasurement(NetworkUpdate2.time, nodePublicKeyStorageC);
	mC2.isValidating = true;
	const mC3 = new NodeMeasurement(NetworkUpdate3.time, nodePublicKeyStorageC);
	mC3.isValidating = false;
	const mC4 = new NodeMeasurement(NetworkUpdate4.time, nodePublicKeyStorageC);
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
			event.sourceId.value === nodePublicKeyStorageC.value &&
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
			event.sourceId.value === nodePublicKeyStorageA.value
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
			event.sourceId.value === nodePublicKeyStorageA.value
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

	const organizationId = new OrganizationId('A');
	await organizationIdRepository.save([organizationId]);

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
