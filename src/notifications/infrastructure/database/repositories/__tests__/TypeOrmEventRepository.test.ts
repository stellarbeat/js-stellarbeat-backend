import {
	FullValidatorXUpdatesHistoryArchiveOutOfDateEvent,
	NodeXUpdatesConnectivityErrorEvent,
	NodeXUpdatesInactiveEvent,
	NodeXUpdatesStellarCoreBehindEvent,
	OrganizationXUpdatesTomlErrorEvent,
	OrganizationXUpdatesUnavailableEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../../../../domain/event/Event';
import {
	OrganizationId as EventOrganizationId,
	PublicKey as EventPublicKey
} from '../../../../domain/event/EventSourceId';
import { NodeMeasurementRepository } from '../../../../../network-scan/domain/node/NodeMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../../../../network-scan/domain/organization/OrganizationMeasurementRepository';
import { createDummyOrganizationId } from '../../../../../network-scan/domain/organization/__fixtures__/createDummyOrganizationId';
import { mock } from 'jest-mock-extended';
import { createDummyPublicKey } from '../../../../../network-scan/domain/node/__fixtures__/createDummyPublicKey';
import { TypeOrmEventRepository } from '../TypeOrmEventRepository';

it('should fetch node measurement events', async function () {
	const publicKeyA = createDummyPublicKey();
	const publicKeyB = createDummyPublicKey();
	const publicKeyC = createDummyPublicKey();

	const nodeMeasurementRepository = mock<NodeMeasurementRepository>();
	const organizationMeasurementRepository =
		mock<OrganizationMeasurementRepository>();
	const eventRepository = new TypeOrmEventRepository(
		nodeMeasurementRepository,
		organizationMeasurementRepository
	);
	nodeMeasurementRepository.findEventsForXNetworkScans.mockResolvedValue([
		{
			time: new Date('01-01-2020').toISOString(),
			connectivityIssues: true,
			inactive: false,
			notValidating: false,
			historyOutOfDate: false,
			publicKey: publicKeyA.value,
			stellarCoreVersionBehindIssue: true
		},
		{
			time: new Date('01-01-2020').toISOString(),
			connectivityIssues: false,
			inactive: true,
			notValidating: false,
			historyOutOfDate: false,
			publicKey: publicKeyA.value,
			stellarCoreVersionBehindIssue: false
		},
		{
			time: new Date('01-01-2020').toISOString(),
			connectivityIssues: false,
			inactive: false,
			notValidating: true,
			historyOutOfDate: false,
			publicKey: publicKeyB.value,
			stellarCoreVersionBehindIssue: false
		},
		{
			time: new Date('02-01-2020').toISOString(),
			connectivityIssues: false,
			inactive: false,
			notValidating: false,
			historyOutOfDate: true,
			publicKey: publicKeyC.value,
			stellarCoreVersionBehindIssue: false
		}
	]);

	const events = await eventRepository.findNodeEventsForXNetworkScans(
		2,
		new Date('02-01-2020')
	);

	expect(events).toHaveLength(5);
	expect(
		events.filter((event) => event.sourceId.value === publicKeyA.value)
	).toHaveLength(3);
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
				event instanceof NodeXUpdatesStellarCoreBehindEvent &&
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
	const organizationId1 = createDummyOrganizationId();
	const organizationId2 = createDummyOrganizationId();
	const organizationId3 = createDummyOrganizationId();

	const nodeMeasurementRepository = mock<NodeMeasurementRepository>();
	const organizationMeasurementRepository =
		mock<OrganizationMeasurementRepository>();

	organizationMeasurementRepository.findEventsForXNetworkScans.mockResolvedValue(
		[
			{
				time: new Date('03-01-2020').toISOString(),
				subQuorumUnavailable: true,
				tomlIssue: false,
				organizationId: organizationId1.value
			},
			{
				time: new Date('02-01-2020').toISOString(),
				subQuorumUnavailable: false,
				tomlIssue: true,
				organizationId: organizationId2.value
			},
			{
				time: new Date('01-01-2020').toISOString(),
				subQuorumUnavailable: true,
				tomlIssue: true,
				organizationId: organizationId3.value
			}
		]
	);
	const eventRepository = new TypeOrmEventRepository(
		nodeMeasurementRepository,
		organizationMeasurementRepository
	);

	const events =
		await eventRepository.findOrganizationMeasurementEventsForXNetworkScans(
			2,
			new Date('02-01-2020')
		);

	expect(events).toHaveLength(4);
	expect(
		events.filter(
			(event) =>
				event instanceof OrganizationXUpdatesUnavailableEvent &&
				event.sourceId instanceof EventOrganizationId &&
				event.sourceId.value === organizationId1.value &&
				event.time.getTime() === new Date('03-01-2020').getTime() &&
				event.data.numberOfUpdates === 2
		)
	).toHaveLength(1);
	expect(
		events.filter(
			(event) =>
				event instanceof OrganizationXUpdatesTomlErrorEvent &&
				event.sourceId instanceof EventOrganizationId &&
				event.sourceId.value === organizationId2.value &&
				event.time.getTime() === new Date('02-01-2020').getTime() &&
				event.data.numberOfUpdates === 2
		)
	).toHaveLength(1);
});
