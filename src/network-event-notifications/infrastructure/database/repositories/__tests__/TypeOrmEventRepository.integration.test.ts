import NetworkUpdate from '../../../../../network/domain/NetworkUpdate';
import NodePublicKeyStorage, {
	NodePublicKeyStorageRepository
} from '../../../../../network/infrastructure/database/entities/NodePublicKeyStorage';
import NodeMeasurementV2 from '../../../../../network/infrastructure/database/entities/NodeMeasurementV2';
import { Container } from 'inversify';
import Kernel from '../../../../../shared/core/Kernel';
import { NetworkUpdateRepository } from '../../../../../network/infrastructure/database/repositories/NetworkUpdateRepository';
import { NodeMeasurementV2Repository } from '../../../../../network/infrastructure/database/repositories/NodeMeasurementV2Repository';
import { ConfigMock } from '../../../../../config/__mocks__/configMock';
import { Connection } from 'typeorm';
import {
	FullValidatorXUpdatesHistoryArchiveOutOfDateEvent,
	NodeXUpdatesInactiveEvent,
	OrganizationXUpdatesUnavailableEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../../../../domain/event/Event';
import OrganizationIdStorage, {
	OrganizationIdStorageRepository
} from '../../../../../network/infrastructure/database/entities/OrganizationIdStorage';
import OrganizationMeasurement from '../../../../../network/infrastructure/database/entities/OrganizationMeasurement';
import { OrganizationMeasurementRepository } from '../../../../../network/infrastructure/database/repositories/OrganizationMeasurementRepository';
import { EventRepository } from '../../../../domain/event/EventRepository';
import {
	OrganizationId,
	PublicKey
} from '../../../../domain/event/EventSourceId';

let container: Container;
const kernel = new Kernel();
let networkUpdateRepository: NetworkUpdateRepository;
let nodeMeasurementV2Repository: NodeMeasurementV2Repository;
let organizationIdStorageRepository: OrganizationIdStorageRepository;
let organizationMeasurementRepository: OrganizationMeasurementRepository;
let eventRepository: EventRepository;
let nodePublicKeyStorageRepository: NodePublicKeyStorageRepository;
jest.setTimeout(60000); //slow integration tests

beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	organizationMeasurementRepository = container.get(
		OrganizationMeasurementRepository
	);
	organizationIdStorageRepository = container.get(
		'OrganizationIdStorageRepository'
	);
	nodeMeasurementV2Repository = container.get(NodeMeasurementV2Repository);
	nodePublicKeyStorageRepository = container.get(
		'NodePublicKeyStorageRepository'
	);
	networkUpdateRepository = container.get(NetworkUpdateRepository);
	eventRepository = container.get<EventRepository>('EventRepository');
});

afterEach(async () => {
	await container.get(Connection).close();
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

	const nodePublicKeyStorageA = new NodePublicKeyStorage(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZA'
	);
	const nodePublicKeyStorageB = new NodePublicKeyStorage(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	const nodePublicKeyStorageC = new NodePublicKeyStorage(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZC'
	);
	await nodePublicKeyStorageRepository.save([
		nodePublicKeyStorageA,
		nodePublicKeyStorageB,
		nodePublicKeyStorageC
	]);

	const mA1 = new NodeMeasurementV2(NetworkUpdate1.time, nodePublicKeyStorageA);
	mA1.isValidating = true;
	mA1.isFullValidator = true;
	const mA2 = new NodeMeasurementV2(NetworkUpdate2.time, nodePublicKeyStorageA);
	mA2.isValidating = false;
	const mA3 = new NodeMeasurementV2(NetworkUpdate3.time, nodePublicKeyStorageA);
	mA3.isValidating = false;
	const mA4 = new NodeMeasurementV2(NetworkUpdate4.time, nodePublicKeyStorageA);
	mA4.isValidating = false;

	//should not detect node that is not validating longer then three NetworkUpdates.
	const mB1 = new NodeMeasurementV2(NetworkUpdate1.time, nodePublicKeyStorageB);
	mB1.isValidating = false;
	const mB2 = new NodeMeasurementV2(NetworkUpdate2.time, nodePublicKeyStorageB);
	mB2.isValidating = false;
	const mB3 = new NodeMeasurementV2(NetworkUpdate3.time, nodePublicKeyStorageB);
	mB3.isValidating = false;
	const mB4 = new NodeMeasurementV2(NetworkUpdate4.time, nodePublicKeyStorageB);
	mB4.isValidating = false;

	const mC1 = new NodeMeasurementV2(NetworkUpdate1.time, nodePublicKeyStorageC);
	mC1.isValidating = false;
	mC1.isActive = true;
	const mC2 = new NodeMeasurementV2(NetworkUpdate2.time, nodePublicKeyStorageC);
	mC2.isValidating = true;
	const mC3 = new NodeMeasurementV2(NetworkUpdate3.time, nodePublicKeyStorageC);
	mC3.isValidating = false;
	const mC4 = new NodeMeasurementV2(NetworkUpdate4.time, nodePublicKeyStorageC);
	mC4.isValidating = false;

	await nodeMeasurementV2Repository.save([
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

	const events = await eventRepository.findNodeEventsInXLatestNetworkUpdates(3);
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
			event.sourceId.value === nodePublicKeyStorageC.publicKey &&
			event.sourceId instanceof PublicKey
	);
	expect(inactiveEventsRightTarget).toHaveLength(1);

	const notValidatingEvents = events.filter(
		(event) => event instanceof ValidatorXUpdatesNotValidatingEvent
	);
	expect(notValidatingEvents).toHaveLength(1);

	const notValidatingEventsRightTarget = events.filter(
		(event) =>
			event instanceof ValidatorXUpdatesNotValidatingEvent &&
			event.sourceId.value === nodePublicKeyStorageA.publicKey
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
			event.sourceId.value === nodePublicKeyStorageA.publicKey
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

	const organizationIdStorage = new OrganizationIdStorage('A');
	await organizationIdStorageRepository.save([organizationIdStorage]);

	const mA1 = new OrganizationMeasurement(
		NetworkUpdate1.time,
		organizationIdStorage
	);
	mA1.isSubQuorumAvailable = true;

	const mA2 = new OrganizationMeasurement(
		NetworkUpdate2.time,
		organizationIdStorage
	);
	mA1.isSubQuorumAvailable = true;
	const mA3 = new OrganizationMeasurement(
		NetworkUpdate3.time,
		organizationIdStorage
	);
	mA1.isSubQuorumAvailable = true;

	await organizationMeasurementRepository.save([mA1, mA2, mA3]);
	const events =
		await eventRepository.findOrganizationMeasurementEventsInXLatestNetworkUpdates(
			2
		);
	expect(events).toHaveLength(1);
	expect(
		events.filter(
			(event) =>
				event instanceof OrganizationXUpdatesUnavailableEvent &&
				event.sourceId instanceof OrganizationId &&
				event.sourceId.value === organizationIdStorage.organizationId &&
				event.time.getTime() === new Date('03-01-2020').getTime() &&
				event.data.numberOfUpdates === 2
		)
	).toHaveLength(1);
});
