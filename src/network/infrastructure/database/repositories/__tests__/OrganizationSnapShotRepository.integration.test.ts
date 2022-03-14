import { Container } from 'inversify';
import Kernel from '../../../../../shared/core/Kernel';
import { Connection } from 'typeorm';
import OrganizationSnapShotRepository from '../OrganizationSnapShotRepository';
import { Organization } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotFactory from '../../snapshotting/factory/OrganizationSnapShotFactory';
import OrganizationIdStorage from '../../entities/OrganizationIdStorage';
import { ConfigMock } from '../../../../../config/__mocks__/configMock';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let organizationSnapShotRepository: OrganizationSnapShotRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		organizationSnapShotRepository = container.get(
			OrganizationSnapShotRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findLatest', async () => {
		const organization = new Organization('1', 'myOrg');
		organization.description = 'hi there';
		const organizationSnapShotFactory = container.get(
			OrganizationSnapShotFactory
		);
		const organizationIdStorage = new OrganizationIdStorage(
			organization.id,
			new Date()
		);
		const initialDate = new Date();
		const snapshot1 = organizationSnapShotFactory.create(
			organizationIdStorage,
			organization,
			initialDate,
			[]
		);
		const otherOrganization = new Organization('2', 'other');
		const irrelevantSnapshot = organizationSnapShotFactory.create(
			new OrganizationIdStorage(otherOrganization.id, new Date()),
			otherOrganization,
			initialDate,
			[]
		);
		await organizationSnapShotRepository.save([snapshot1, irrelevantSnapshot]);
		snapshot1.id = 1; //typeorm bug: doesn't update id...
		organization.description = 'I changed';
		const updatedDate = new Date();
		const snapShot2 = organizationSnapShotFactory.createUpdatedSnapShot(
			snapshot1,
			organization,
			updatedDate,
			[]
		);
		await organizationSnapShotRepository.save([snapshot1, snapShot2]);
		let snapShots =
			await organizationSnapShotRepository.findLatestByOrganization(
				organizationIdStorage
			);
		expect(snapShots.length).toEqual(2);
		expect(snapShots[0]!.description).toEqual('I changed');
		expect(snapShots[1]!.description).toEqual('hi there');

		snapShots = await organizationSnapShotRepository.findLatestByOrganization(
			organizationIdStorage,
			initialDate
		);
		expect(snapShots.length).toEqual(1);
		expect(snapShots[0]!.description).toEqual('hi there');

		snapShots = await organizationSnapShotRepository.findLatest(initialDate);
		expect(snapShots.length).toEqual(2);
	});
});
