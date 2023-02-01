import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { OrganizationRepository } from '../../../../domain/organization/OrganizationRepository';
import { createDummyOrganizationId } from '../../../../domain/organization/__fixtures__/createDummyOrganizationId';
import Organization from '../../../../domain/organization/Organization';
import { OrganizationContactInformation } from '../../../../domain/organization/OrganizationContactInformation';
import { OrganizationValidators } from '../../../../domain/organization/OrganizationValidators';
import { createDummyPublicKey } from '../../../../domain/node/__fixtures__/createDummyPublicKey';
import { TestUtils } from '../../../../../core/utilities/TestUtils';
import { Connection } from 'typeorm';
import OrganizationMeasurement from '../../../../domain/organization/OrganizationMeasurement';

describe('TypeOrmOrganizationRepository', () => {
	let container: Container;
	let kernel: Kernel;
	let repo: OrganizationRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeAll(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		repo = container.get<OrganizationRepository>(
			NETWORK_TYPES.OrganizationRepository
		);
	});

	afterEach(async () => {
		await TestUtils.resetDB(kernel.container.get(Connection));
	});

	afterAll(async () => {
		await kernel.close();
	});

	function assertOrganization(
		organization: Organization,
		retrieved?: Organization
	) {
		expect(retrieved).toBeInstanceOf(Organization);
		expect(retrieved?.isAvailable()).toBeTruthy();
		expect(retrieved?.organizationId.equals(organization.organizationId));
		expect(retrieved?.snapshotEndDate).toEqual(organization.snapshotEndDate);
		expect(retrieved?.homeDomain).toEqual(organization.homeDomain);
		expect(retrieved?.name).toEqual(organization.name);
		expect(retrieved?.description).toEqual(organization.description);
		expect(retrieved?.url).toEqual(organization.url);
		expect(
			retrieved?.contactInformation.equals(organization.contactInformation)
		).toEqual(true);
		expect(retrieved?.horizonUrl).toEqual(organization.horizonUrl);
		expect(retrieved?.validators.equals(organization.validators)).toEqual(true);
	}

	function createOrganization(time: Date, domain = 'domain') {
		const organizationId = createDummyOrganizationId();
		const organization = Organization.create(organizationId, domain, time);
		organization.updateContactInformation(
			OrganizationContactInformation.create({
				officialEmail: 'officialEmail',
				twitter: 'twitter',
				github: 'github',
				keybase: 'keybase',
				phoneNumber: 'phoneNumber',
				physicalAddress: 'physicalAddress',
				dba: 'dba'
			}),
			time
		);
		organization.updateUrl('url', time);
		organization.updateName('name', time);
		organization.updateDescription('description', time);
		organization.updateHorizonUrl('horizonUrl', time);
		organization.updateValidators(
			new OrganizationValidators([createDummyPublicKey()]),
			time
		);
		const measurement = new OrganizationMeasurement(time, organization);
		measurement.isSubQuorumAvailable = true;
		organization.addMeasurement(measurement);
		return organization;
	}

	test('save and findById', async () => {
		const time = new Date('2020-01-01');
		const organization = createOrganization(time);
		organization.archive(new Date('2020-01-02'));
		await repo.save([organization], time);

		const retrieved = await repo.findByOrganizationId(
			organization.organizationId
		);
		assertOrganization(organization, retrieved);
	});

	test('save and findByHomeDomain', async () => {
		const time = new Date('2020-01-01');
		const organization = createOrganization(time);
		organization.archive(new Date('2020-01-02'));
		await repo.save([organization], time);

		const retrieved = await repo.findByHomeDomains([organization.homeDomain]);
		assertOrganization(organization, retrieved[0]);
	});

	test('findActive', async () => {
		const time = new Date();
		const organization = createOrganization(time);
		const organization2 = createOrganization(time, 'other-domain');
		await repo.save([organization, organization2], time);

		const retrieved = await repo.findActive(time);
		expect(retrieved).toHaveLength(2);
		assertOrganization(organization, retrieved[0]);
		assertOrganization(organization2, retrieved[1]);
	});
});
