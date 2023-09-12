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

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: OrganizationMeasurementRepository;
	let versionedOrganizationRepository: OrganizationRepository;

	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get(NETWORK_TYPES.OrganizationMeasurementRepository);
		versionedOrganizationRepository = container.get(
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
		await versionedOrganizationRepository.save(
			[idA, idB],
			new Date('12/12/2020')
		);
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
});
