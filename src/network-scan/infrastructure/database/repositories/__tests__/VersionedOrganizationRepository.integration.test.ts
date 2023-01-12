import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { VersionedOrganizationRepository } from '../../../../domain/organization/VersionedOrganizationRepository';
import { createDummyOrganizationId } from '../../../../domain/organization/__fixtures__/createDummyOrganizationId';
import VersionedOrganization from '../../../../domain/organization/VersionedOrganization';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: VersionedOrganizationRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get<VersionedOrganizationRepository>(
			NETWORK_TYPES.VersionedOrganizationRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('save and findById', async () => {
		const organizationId = createDummyOrganizationId();
		const organization = new VersionedOrganization(organizationId);
		await repo.save(organization);

		const retrieved = await repo.findByOrganizationId(organizationId);
		expect(retrieved).toBeInstanceOf(VersionedOrganization);
		expect(retrieved?.organizationId.value).toEqual(organizationId.value);
	});
});
