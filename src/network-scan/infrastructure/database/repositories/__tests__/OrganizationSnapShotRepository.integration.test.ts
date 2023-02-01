import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import TypeOrmOrganizationSnapShotRepository from '../TypeOrmOrganizationSnapShotRepository';
import Organization from '../../../../domain/organization/Organization';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyOrganizationId } from '../../../../domain/organization/__fixtures__/createDummyOrganizationId';
import { TypeOrmOrganizationRepository } from '../TypeOrmOrganizationRepository';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let organizationSnapShotRepository: TypeOrmOrganizationSnapShotRepository;
	let organizationRepository: TypeOrmOrganizationRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		organizationSnapShotRepository = container.get(
			NETWORK_TYPES.OrganizationSnapshotRepository
		);
		organizationRepository = container.get(
			NETWORK_TYPES.OrganizationRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findLatest', async () => {
		const time = new Date();
		const organization = Organization.create(
			createDummyOrganizationId(),
			'home',
			time
		);

		const organization2 = Organization.create(
			createDummyOrganizationId(),
			'home2',
			time
		);

		await organizationRepository.save([organization, organization2], time);

		const latest = await organizationSnapShotRepository.findLatest();
		expect(latest.length).toEqual(2);
	});

	test('findLatestOrganizationId', async () => {
		const time = new Date('2020-01-01');
		const organization = Organization.create(
			createDummyOrganizationId(),
			'home',
			time
		);
		organization.updateName('home2', new Date('2020-01-02'));
		organization.updateUrl('home3', new Date('2020-01-03'));

		const organization2 = Organization.create(
			createDummyOrganizationId(),
			'home2',
			time
		);

		await organizationRepository.save([organization, organization2], time);

		const latest =
			await organizationSnapShotRepository.findLatestByOrganizationId(
				organization.organizationId
			);
		expect(latest.length).toEqual(3);
		expect(
			latest.filter((snapshot) =>
				snapshot.organization.organizationId.equals(organization.organizationId)
			).length
		).toEqual(3);
	});
});
