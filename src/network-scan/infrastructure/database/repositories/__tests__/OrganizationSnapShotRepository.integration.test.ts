import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import TypeOrmOrganizationSnapShotRepository from '../TypeOrmOrganizationSnapShotRepository';
import { Organization as OrganizationDTO } from '@stellarbeat/js-stellarbeat-shared';
import OrganizationSnapShotFactory from '../../../../domain/organization/snapshotting/OrganizationSnapShotFactory';
import Organization from '../../../../domain/organization/Organization';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyOrganizationId } from '../../../../domain/organization/__fixtures__/createDummyOrganizationId';
import { createDummyPublicKeyString } from '../../../../domain/node/__fixtures__/createDummyPublicKey';
import PublicKey from '../../../../domain/node/PublicKey';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let organizationSnapShotRepository: TypeOrmOrganizationSnapShotRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		organizationSnapShotRepository = container.get(
			NETWORK_TYPES.OrganizationSnapshotRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findLatest', async () => {
		const organizationId = createDummyOrganizationId();
		const organization = new OrganizationDTO(organizationId.value, 'myOrg');
		const validators = [createDummyPublicKeyString()];
		organization.validators = validators;
		organization.description = 'hi there';
		const organizationSnapShotFactory = container.get(
			OrganizationSnapShotFactory
		);
		const versionedOrganization = Organization.create(
			organizationId,
			'domain',
			new Date()
		);
		const initialDate = new Date();
		const snapshot1 = organizationSnapShotFactory.create(
			versionedOrganization,
			organization,
			initialDate
		);
		const otherOrganizationId = createDummyOrganizationId();
		const otherOrganization = new OrganizationDTO(
			otherOrganizationId.value,
			otherOrganizationId.value
		);
		const irrelevantSnapshot = organizationSnapShotFactory.create(
			Organization.create(otherOrganizationId, 'domain', new Date()),
			otherOrganization,
			initialDate
		);
		await organizationSnapShotRepository.save([snapshot1, irrelevantSnapshot]);
		organization.description = 'I changed';
		const updatedDate = new Date();
		const snapShot2 = organizationSnapShotFactory.createUpdatedSnapShot(
			snapshot1,
			organization,
			updatedDate
		);

		snapshot1.endDate = updatedDate;
		await organizationSnapShotRepository.save([snapshot1, snapShot2]);
		let snapShots =
			await organizationSnapShotRepository.findLatestByOrganization(
				versionedOrganization
			);
		expect(snapShots.length).toEqual(2);
		expect(snapShots[0]?.description).toEqual('I changed');
		expect(snapShots[1]?.description).toEqual('hi there');
		expect(
			snapShots[0]?.validators.value.map((validator) => validator.value)
		).toEqual(validators);
		expect(snapShots[0].validators.value[0]).toBeInstanceOf(PublicKey);

		snapShots = await organizationSnapShotRepository.findLatestByOrganization(
			versionedOrganization,
			initialDate
		);
		expect(snapShots.length).toEqual(1);
		expect(snapShots[0]?.description).toEqual('hi there');

		snapShots = await organizationSnapShotRepository.findLatest(initialDate);
		expect(snapShots.length).toEqual(2);
	});
});
