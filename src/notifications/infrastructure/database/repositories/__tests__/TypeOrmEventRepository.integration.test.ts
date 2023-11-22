import NetworkScan from '../../../../../network-scan/domain/network/scan/NetworkScan';
import NodeMeasurement from '../../../../../network-scan/domain/node/NodeMeasurement';
import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { TypeOrmNetworkScanRepository } from '../../../../../network-scan/infrastructure/database/repositories/TypeOrmNetworkScanRepository';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import {
	FullValidatorXUpdatesHistoryArchiveOutOfDateEvent,
	NodeXUpdatesConnectivityErrorEvent,
	NodeXUpdatesInactiveEvent,
	OrganizationXUpdatesUnavailableEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../../../../domain/event/Event';
import Organization from '../../../../../network-scan/domain/organization/Organization';
import OrganizationMeasurement from '../../../../../network-scan/domain/organization/OrganizationMeasurement';
import { EventRepository } from '../../../../domain/event/EventRepository';
import {
	OrganizationId as EventOrganizationId,
	PublicKey as EventPublicKey
} from '../../../../domain/event/EventSourceId';
import { NodeMeasurementRepository } from '../../../../../network-scan/domain/node/NodeMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../../../../network-scan/domain/organization/OrganizationMeasurementRepository';
import { NETWORK_TYPES } from '../../../../../network-scan/infrastructure/di/di-types';
import { createDummyOrganizationId } from '../../../../../network-scan/domain/organization/__fixtures__/createDummyOrganizationId';
import { OrganizationRepository } from '../../../../../network-scan/domain/organization/OrganizationRepository';
import { createDummyNode } from '../../../../../network-scan/domain/node/__fixtures__/createDummyNode';
import { NodeRepository } from '../../../../../network-scan/domain/node/NodeRepository';
import NetworkMeasurement from '../../../../../network-scan/domain/network/NetworkMeasurement';
import { mock } from 'jest-mock-extended';
import { TypeOrmNodeMeasurementRepository } from '../../../../../network-scan/infrastructure/database/repositories/TypeOrmNodeMeasurementRepository';
import { _MockProxy } from 'jest-mock-extended/lib/Mock';
import { createDummyPublicKey } from '../../../../../network-scan/domain/node/__fixtures__/createDummyPublicKey';

let container: Container;
let kernel: Kernel;
let networkScanRepository: TypeOrmNetworkScanRepository;
let nodeMeasurementRepository: _MockProxy<NodeMeasurementRepository> &
	NodeMeasurementRepository;
let organizationRepository: OrganizationRepository;
let organizationMeasurementRepository: OrganizationMeasurementRepository;
let eventRepository: EventRepository;
let nodeRepository: NodeRepository;
jest.setTimeout(60000); //slow integration tests

beforeEach(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	nodeMeasurementRepository = mock<NodeMeasurementRepository>();
	container
		.rebind<NodeMeasurementRepository>(NETWORK_TYPES.NodeMeasurementRepository)
		.toConstantValue(nodeMeasurementRepository);
	organizationMeasurementRepository =
		container.get<OrganizationMeasurementRepository>(
			NETWORK_TYPES.OrganizationMeasurementRepository
		);
	organizationRepository = container.get(NETWORK_TYPES.OrganizationRepository);
	nodeRepository = container.get(NETWORK_TYPES.NodeRepository);
	networkScanRepository = container.get(NETWORK_TYPES.NetworkScanRepository);
	eventRepository = container.get<EventRepository>('EventRepository');
});

afterEach(async () => {
	await kernel.close();
});

it('should fetch node measurement events', async function () {
	const publicKeyA = createDummyPublicKey();
	const publicKeyB = createDummyPublicKey();
	const publicKeyC = createDummyPublicKey();
	nodeMeasurementRepository.findEventsForXNetworkScans.mockResolvedValue([
		{
			time: new Date('01-01-2020').toISOString(),
			connectivityIssues: true,
			inactive: false,
			notValidating: false,
			historyOutOfDate: false,
			publicKey: publicKeyA.value
		},
		{
			time: new Date('01-01-2020').toISOString(),
			connectivityIssues: false,
			inactive: true,
			notValidating: false,
			historyOutOfDate: false,
			publicKey: publicKeyA.value
		},
		{
			time: new Date('01-01-2020').toISOString(),
			connectivityIssues: false,
			inactive: false,
			notValidating: true,
			historyOutOfDate: false,
			publicKey: publicKeyB.value
		},
		{
			time: new Date('02-01-2020').toISOString(),
			connectivityIssues: false,
			inactive: false,
			notValidating: false,
			historyOutOfDate: true,
			publicKey: publicKeyC.value
		}
	]);

	const events = await eventRepository.findNodeEventsForXNetworkScans(
		2,
		new Date('02-01-2020')
	);

	expect(events).toHaveLength(4);
	expect(
		events.filter((event) => event.sourceId.value === publicKeyA.value)
	).toHaveLength(2);
	expect(
		events.filter((event) => event.sourceId.value === publicKeyB.value)
	).toHaveLength(1);
	expect(
		events.filter((event) => event.sourceId.value === publicKeyC.value)
	).toHaveLength(1);

	expect(
		events.filter(
			(event) =>
				event instanceof NodeXUpdatesInactiveEvent &&
				event.sourceId instanceof EventPublicKey &&
				event.sourceId.value === publicKeyA.value &&
				event.time.getTime() === new Date('01-01-2020').getTime() &&
				event.data.numberOfUpdates === 2
		)
	).toHaveLength(1);

	expect(
		events.filter(
			(event) =>
				event instanceof ValidatorXUpdatesNotValidatingEvent &&
				event.sourceId instanceof EventPublicKey &&
				event.sourceId.value === publicKeyB.value &&
				event.time.getTime() === new Date('01-01-2020').getTime() &&
				event.data.numberOfUpdates === 2
		)
	).toHaveLength(1);

	expect(
		events.filter(
			(event) =>
				event instanceof FullValidatorXUpdatesHistoryArchiveOutOfDateEvent &&
				event.sourceId instanceof EventPublicKey &&
				event.sourceId.value === publicKeyC.value &&
				event.time.getTime() === new Date('02-01-2020').getTime() &&
				event.data.numberOfUpdates === 2
		)
	).toHaveLength(1);

	expect(
		events.filter(
			(event) =>
				event instanceof NodeXUpdatesConnectivityErrorEvent &&
				event.sourceId instanceof EventPublicKey &&
				event.sourceId.value === publicKeyA.value &&
				event.time.getTime() === new Date('01-01-2020').getTime() &&
				event.data.numberOfUpdates === 2
		)
	).toHaveLength(1);
});

it('should fetch organization events', async function () {
	const NetworkUpdate1 = new NetworkScan(new Date('01-01-2020'));
	NetworkUpdate1.completed = true;
	NetworkUpdate1.measurement = new NetworkMeasurement(NetworkUpdate1.time);
	const NetworkUpdate2 = new NetworkScan(new Date('02-01-2020'));
	NetworkUpdate2.measurement = new NetworkMeasurement(NetworkUpdate2.time);
	NetworkUpdate2.completed = true;
	const NetworkUpdate3 = new NetworkScan(new Date('03-01-2020'));
	NetworkUpdate3.measurement = new NetworkMeasurement(NetworkUpdate3.time);
	NetworkUpdate3.completed = true;
	await networkScanRepository.save([
		NetworkUpdate1,
		NetworkUpdate3,
		NetworkUpdate2
	]);

	const organizationId = createDummyOrganizationId();
	const organization = Organization.create(
		organizationId,
		'domain',
		new Date('01-01-2020')
	);
	await organizationRepository.save([organization], new Date('01-01-2020'));

	const mA1 = new OrganizationMeasurement(NetworkUpdate1.time, organization);
	mA1.isSubQuorumAvailable = true;

	const mA2 = new OrganizationMeasurement(NetworkUpdate2.time, organization);
	mA1.isSubQuorumAvailable = true;
	const mA3 = new OrganizationMeasurement(NetworkUpdate3.time, organization);
	mA1.isSubQuorumAvailable = true;

	await organizationMeasurementRepository.save([mA1, mA2, mA3]);
	const events =
		await eventRepository.findOrganizationMeasurementEventsForXNetworkScans(
			2,
			NetworkUpdate3.time
		);
	expect(events).toHaveLength(1);
	expect(
		events.filter(
			(event) =>
				event instanceof OrganizationXUpdatesUnavailableEvent &&
				event.sourceId instanceof EventOrganizationId &&
				event.sourceId.value === organization.organizationId.value &&
				event.time.getTime() === new Date('03-01-2020').getTime() &&
				event.data.numberOfUpdates === 2
		)
	).toHaveLength(1);
});
