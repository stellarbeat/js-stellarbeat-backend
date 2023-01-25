import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { OrganizationRepository } from '../../../../domain/organization/OrganizationRepository';
import { createDummyOrganizationId } from '../../../../domain/organization/__fixtures__/createDummyOrganizationId';
import Organization from '../../../../domain/organization/Organization';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: OrganizationRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get<OrganizationRepository>(
			NETWORK_TYPES.OrganizationRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('save and findById', async () => {
		const organizationId = createDummyOrganizationId();
		const organization = Organization.create(organizationId, new Date());
		await repo.save(organization);

		const retrieved = await repo.findByOrganizationId(organizationId);
		expect(retrieved).toBeInstanceOf(Organization);
		expect(retrieved?.organizationId.value).toEqual(organizationId.value);
	});
});
