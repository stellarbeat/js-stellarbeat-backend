import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyPublicKey } from '../../../../domain/node/__fixtures__/createDummyPublicKey';
import VersionedNode, {
	VersionedNodeRepository
} from '../../../../domain/node/VersionedNode';
import { NodeMeasurementDayRepository } from '../../../../domain/node/NodeMeasurementDayRepository';
import NodeMeasurementDay from '../../../../domain/node/NodeMeasurementDay';
import { TypeOrmOrganizationMeasurementDayRepository } from '../TypeOrmOrganizationMeasurementDayRepository';
import { VersionedOrganizationRepository } from '../../../../domain/organization/VersionedOrganizationRepository';
import { OrganizationMeasurementDayRepository } from '../../../../domain/organization/OrganizationMeasurementDayRepository';
import VersionedOrganization from '../../../../domain/organization/VersionedOrganization';
import { createDummyOrganizationId } from '../../../../domain/organization/__fixtures__/createDummyOrganizationId';
import OrganizationMeasurementDay from '../../../../domain/organization/OrganizationMeasurementDay';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: TypeOrmOrganizationMeasurementDayRepository;
	let versionedOrganizationRepository: VersionedOrganizationRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get(NETWORK_TYPES.OrganizationMeasurementDayRepository);
		versionedOrganizationRepository = container.get(
			NETWORK_TYPES.VersionedOrganizationRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findBetween', async () => {
		const idA = new VersionedOrganization(createDummyOrganizationId());
		const idB = new VersionedOrganization(createDummyOrganizationId());
		await versionedOrganizationRepository.save([idA, idB]);
		await repo.save([
			new OrganizationMeasurementDay('12/12/2020', idA),
			new OrganizationMeasurementDay('12/12/2020', idB),
			new OrganizationMeasurementDay('12/13/2020', idA),
			new OrganizationMeasurementDay('12/13/2020', idB)
		]);

		const measurements = await repo.findBetween(
			idA.organizationId,
			new Date('12/12/2020'),
			new Date('12/13/2020')
		);
		expect(measurements.length).toEqual(2);
	});

	test('findXDaysAverageAt', async () => {
		const idA = new VersionedOrganization(createDummyOrganizationId());
		await versionedOrganizationRepository.save([idA]);
		const a = new OrganizationMeasurementDay('12/12/2020', idA);
		a.crawlCount = 2;
		a.isSubQuorumAvailableCount = 2;
		const b = new OrganizationMeasurementDay('12/13/2020', idA);
		b.crawlCount = 2;
		b.isSubQuorumAvailableCount = 2;
		await repo.save([a, b]);

		const averages = await repo.findXDaysAverageAt(new Date('12/13/2020'), 2);
		expect(averages.length).toEqual(1);
		expect(averages[0].isSubQuorumAvailableAvg).toEqual(100);
		expect(averages[0].organizationId).toEqual(idA.id);
	});
});
