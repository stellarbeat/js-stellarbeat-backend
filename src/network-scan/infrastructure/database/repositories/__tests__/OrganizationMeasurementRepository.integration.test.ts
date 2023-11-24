import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import Organization from '../../../../domain/organization/Organization';
import OrganizationMeasurement from '../../../../domain/organization/OrganizationMeasurement';
import { OrganizationMeasurementRepository } from '../../../../domain/organization/OrganizationMeasurementRepository';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyOrganizationId } from '../../../../domain/organization/__fixtures__/createDummyOrganizationId';
import { OrganizationRepository } from '../../../../domain/organization/OrganizationRepository';
import { TomlState } from '../../../../domain/organization/scan/TomlState';
import { createDummyOrganizationV1 } from '../../../../services/__fixtures__/createDummyOrganizationV1';
import NetworkScan from '../../../../domain/network/scan/NetworkScan';
import NetworkMeasurement from '../../../../domain/network/NetworkMeasurement';
import { NetworkScanRepository } from '../../../../domain/network/scan/NetworkScanRepository';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: OrganizationMeasurementRepository;
	let organizationRepository: OrganizationRepository;

	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get(NETWORK_TYPES.OrganizationMeasurementRepository);
		organizationRepository = container.get(
			NETWORK_TYPES.OrganizationRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findBetween', async () => {
		const a = createDummyOrganizationId();
		const b = createDummyOrganizationId();
		const idA = Organization.create(a, 'domain', new Date());
		const idB = Organization.create(b, 'domain2', new Date());
		await organizationRepository.save([idA, idB], new Date('12/12/2020'));
		const idATomlOkMeasurement = new OrganizationMeasurement(
			new Date('12/12/2020'),
			idA
		);
		idATomlOkMeasurement.tomlState = TomlState.Ok;

		await repo.save([
			idATomlOkMeasurement,
			new OrganizationMeasurement(new Date('12/12/2020'), idB),
			new OrganizationMeasurement(new Date('12/13/2020'), idA),
			new OrganizationMeasurement(new Date('12/13/2020'), idB)
		]);

		const measurements = await repo.findBetween(
			a.value,
			new Date('12/12/2020'),
			new Date('12/13/2020')
		);

		expect(measurements.length).toEqual(2);
		expect(measurements[0].organization.organizationId.value).toEqual(a.value);
		expect(
			measurements.filter(
				(measurement) => measurement.tomlState === TomlState.Ok
			)
		).toHaveLength(1);
	});

	test('findEventsForXNetworkScans', async () => {
		const networkScan1 = new NetworkScan(new Date('12/12/2020'));
		networkScan1.completed = true;
		networkScan1.measurement = new NetworkMeasurement(new Date('12/12/2020'));
		const networkScan2 = new NetworkScan(new Date('12/13/2020'));
		networkScan2.completed = true;
		networkScan2.measurement = new NetworkMeasurement(new Date('12/13/2020'));
		const networkScan3 = new NetworkScan(new Date('12/14/2020'));
		networkScan3.completed = true;
		networkScan3.measurement = new NetworkMeasurement(new Date('12/14/2020'));
		const networkScan4 = new NetworkScan(new Date('12/15/2020'));
		networkScan4.completed = true;
		networkScan4.measurement = new NetworkMeasurement(new Date('12/15/2020'));

		await container
			.get<NetworkScanRepository>(NETWORK_TYPES.NetworkScanRepository)
			.save([networkScan1, networkScan2, networkScan3, networkScan4]);

		const organizationNoEvents = Organization.create(
			createDummyOrganizationId(),
			'domain1',
			new Date()
		);
		const organizationAllEvents = Organization.create(
			createDummyOrganizationId(),
			'domain2',
			new Date()
		);
		const organizationIssuesJustStartedButNoEvents = Organization.create(
			createDummyOrganizationId(),
			'domain3',
			new Date()
		);
		await organizationRepository.save(
			[
				organizationNoEvents,
				organizationAllEvents,
				organizationIssuesJustStartedButNoEvents
			],
			new Date()
		);

		const organizationNoEventsMeasurement1 = new OrganizationMeasurement(
			new Date('12/12/2020'),
			organizationNoEvents
		);
		organizationNoEventsMeasurement1.tomlState = TomlState.Ok;
		organizationNoEventsMeasurement1.isSubQuorumAvailable = true;

		const organizationNoEventsMeasurement2 = new OrganizationMeasurement(
			new Date('12/13/2020'),
			organizationNoEvents
		);
		organizationNoEventsMeasurement2.tomlState = TomlState.Ok;
		organizationNoEventsMeasurement2.isSubQuorumAvailable = true;

		const organizationNoEventsMeasurement3 = new OrganizationMeasurement(
			new Date('12/14/2020'),
			organizationNoEvents
		);
		organizationNoEventsMeasurement3.tomlState = TomlState.Ok;
		organizationNoEventsMeasurement3.isSubQuorumAvailable = true;

		const organizationNoEventsMeasurement4 = new OrganizationMeasurement(
			new Date('12/15/2020'),
			organizationNoEvents
		);
		organizationNoEventsMeasurement4.tomlState = TomlState.Ok;
		organizationNoEventsMeasurement4.isSubQuorumAvailable = true;

		const organizationAllEventsMeasurement1 = new OrganizationMeasurement(
			new Date('12/12/2020'),
			organizationAllEvents
		);
		organizationAllEventsMeasurement1.tomlState = TomlState.Ok;
		organizationAllEventsMeasurement1.isSubQuorumAvailable = true;

		const organizationAllEventsMeasurement2 = new OrganizationMeasurement(
			new Date('12/13/2020'),
			organizationAllEvents
		);
		organizationAllEventsMeasurement2.tomlState = TomlState.UnspecifiedError;
		organizationAllEventsMeasurement2.isSubQuorumAvailable = false;

		const organizationAllEventsMeasurement3 = new OrganizationMeasurement(
			new Date('12/14/2020'),
			organizationAllEvents
		);
		organizationAllEventsMeasurement3.tomlState = TomlState.UnspecifiedError;
		organizationAllEventsMeasurement3.isSubQuorumAvailable = false;

		const organizationAllEventsMeasurement4 = new OrganizationMeasurement(
			new Date('12/15/2020'),
			organizationAllEvents
		);
		organizationAllEventsMeasurement4.tomlState = TomlState.UnspecifiedError;
		organizationAllEventsMeasurement4.isSubQuorumAvailable = false;

		const organizationIssuesJustStartedButNoEventsMeasurement1 =
			new OrganizationMeasurement(
				new Date('12/12/2020'),
				organizationIssuesJustStartedButNoEvents
			);
		organizationIssuesJustStartedButNoEventsMeasurement1.tomlState =
			TomlState.Ok;
		organizationIssuesJustStartedButNoEventsMeasurement1.isSubQuorumAvailable =
			true;

		const organizationIssuesJustStartedButNoEventsMeasurement2 =
			new OrganizationMeasurement(
				new Date('12/13/2020'),
				organizationIssuesJustStartedButNoEvents
			);
		organizationIssuesJustStartedButNoEventsMeasurement2.tomlState =
			TomlState.Ok;

		const organizationIssuesJustStartedButNoEventsMeasurement3 =
			new OrganizationMeasurement(
				new Date('12/14/2020'),
				organizationIssuesJustStartedButNoEvents
			);
		organizationIssuesJustStartedButNoEventsMeasurement3.tomlState =
			TomlState.Ok;
		organizationIssuesJustStartedButNoEventsMeasurement3.isSubQuorumAvailable =
			true;

		const organizationIssuesJustStartedButNoEventsMeasurement4 =
			new OrganizationMeasurement(
				new Date('12/15/2020'),
				organizationIssuesJustStartedButNoEvents
			);
		organizationIssuesJustStartedButNoEventsMeasurement4.tomlState =
			TomlState.UnspecifiedError;
		organizationIssuesJustStartedButNoEventsMeasurement4.isSubQuorumAvailable =
			false;

		await repo.save([
			organizationNoEventsMeasurement1,
			organizationNoEventsMeasurement2,
			organizationNoEventsMeasurement3,
			organizationNoEventsMeasurement4,
			organizationAllEventsMeasurement1,
			organizationAllEventsMeasurement2,
			organizationAllEventsMeasurement3,
			organizationAllEventsMeasurement4,
			organizationIssuesJustStartedButNoEventsMeasurement1,
			organizationIssuesJustStartedButNoEventsMeasurement2,
			organizationIssuesJustStartedButNoEventsMeasurement3,
			organizationIssuesJustStartedButNoEventsMeasurement4
		]);

		const events = await repo.findEventsForXNetworkScans(
			3,
			new Date('12/15/2020')
		);
		expect(events.length).toEqual(1);
		expect(events[0].organizationId).toEqual(
			organizationAllEvents.organizationId.value
		);
		expect(events[0].subQuorumUnavailable).toEqual(true);
		expect(events[0].tomlIssue).toEqual(true);
	});
});
