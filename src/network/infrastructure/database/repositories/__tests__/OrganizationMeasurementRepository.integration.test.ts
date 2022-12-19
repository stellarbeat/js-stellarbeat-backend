import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { NodeMeasurementV2Repository } from '../NodeMeasurementV2Repository';
import NodeMeasurementV2 from '../../entities/NodeMeasurementV2';
import NodePublicKeyStorage, {
	NodePublicKeyStorageRepository
} from '../../entities/NodePublicKeyStorage';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NetworkUpdateRepository } from '../NetworkUpdateRepository';
import { OrganizationMeasurementRepository } from '../OrganizationMeasurementRepository';
import OrganizationIdStorage from '../../entities/OrganizationIdStorage';
import OrganizationMeasurement from '../../entities/OrganizationMeasurement';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: OrganizationMeasurementRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get(OrganizationMeasurementRepository);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findBetween', async () => {
		const idA = new OrganizationIdStorage('a');
		const idB = new OrganizationIdStorage('b');
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
		console.log(measurements);
		expect(measurements.length).toEqual(2);
		expect(measurements[0].organizationIdStorage.organizationId).toEqual('a');
	});
});
