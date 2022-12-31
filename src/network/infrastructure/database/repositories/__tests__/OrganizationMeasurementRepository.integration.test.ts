import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import VersionedOrganization from '../../../../domain/VersionedOrganization';
import OrganizationMeasurement from '../../../../domain/measurement/OrganizationMeasurement';
import { OrganizationMeasurementRepository } from '../../../../domain/measurement/OrganizationMeasurementRepository';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyOrganizationId } from '../../../../domain/__fixtures__/createDummyOrganizationId';
import { VersionedOrganizationRepository } from '../../../../domain/VersionedOrganizationRepository';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: OrganizationMeasurementRepository;
	let versionedOrganizationRepository: VersionedOrganizationRepository;

	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get(NETWORK_TYPES.OrganizationMeasurementRepository);
		versionedOrganizationRepository = container.get(
			NETWORK_TYPES.VersionedOrganizationRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findBetween', async () => {
		const a = createDummyOrganizationId();
		const b = createDummyOrganizationId();
		const idA = new VersionedOrganization(a);
		const idB = new VersionedOrganization(b);
		await versionedOrganizationRepository.save(idA);
		await versionedOrganizationRepository.save(idB);
		await repo.save([
			new OrganizationMeasurement(new Date('12/12/2020'), idA),
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
	});
});
