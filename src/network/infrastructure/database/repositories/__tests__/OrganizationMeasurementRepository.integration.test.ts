import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import VersionedOrganization, {
	VersionedOrganizationRepository
} from '../../../../domain/VersionedOrganization';
import OrganizationMeasurement from '../../../../domain/measurement/OrganizationMeasurement';
import { OrganizationMeasurementRepository } from '../../../../domain/measurement/OrganizationMeasurementRepository';
import { NETWORK_TYPES } from '../../../di/di-types';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: OrganizationMeasurementRepository;
	let organizationIdRepository: VersionedOrganizationRepository;

	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get(NETWORK_TYPES.OrganizationMeasurementRepository);
		organizationIdRepository = container.get('OrganizationIdStorageRepository');
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findBetween', async () => {
		const idA = new VersionedOrganization('a');
		const idB = new VersionedOrganization('b');
		await organizationIdRepository.save([idA, idB]);
		await repo.save([
			new OrganizationMeasurement(new Date('12/12/2020'), idA),
			new OrganizationMeasurement(new Date('12/12/2020'), idB),
			new OrganizationMeasurement(new Date('12/13/2020'), idA),
			new OrganizationMeasurement(new Date('12/13/2020'), idB)
		]);

		const measurements = await repo.findBetween(
			idA.organizationId,
			new Date('12/12/2020'),
			new Date('12/13/2020')
		);

		expect(measurements.length).toEqual(2);
		expect(measurements[0].organization.organizationId).toEqual('a');
	});
});
