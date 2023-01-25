import 'reflect-metadata'; //todo: create container without loading the database
import OrganizationSnapShotter from '../OrganizationSnapShotter';
import Organization from '../../Organization';
import OrganizationSnapShot from '../../OrganizationSnapShot';
import { ExceptionLoggerMock } from '../../../../../core/services/__mocks__/ExceptionLoggerMock';
import { LoggerMock } from '../../../../../core/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import OrganizationSnapShotFactory from '../OrganizationSnapShotFactory';
import { OrganizationSnapShotRepository } from '../OrganizationSnapShotRepository';
import { createDummyOrganizationId } from '../../__fixtures__/createDummyOrganizationId';
import { OrganizationRepository } from '../../OrganizationRepository';
import { NodeRepository } from '../../../node/NodeRepository';
import { OrganizationContactInformation } from '../../OrganizationContactInformation';
import { OrganizationValidators } from '../../OrganizationValidators';
const organizationSnapShotRepository = mock<OrganizationSnapShotRepository>();

describe('findLatestSnapShots', () => {
	test('unknownIdShouldReturnEmptyResult', async () => {
		const versionedOrganizationRepo = mock<OrganizationRepository>();
		const organizationSnapShotter = new OrganizationSnapShotter(
			mock<NodeRepository>(),
			organizationSnapShotRepository,
			versionedOrganizationRepo,
			mock<OrganizationSnapShotFactory>(),
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const snapShots =
			await organizationSnapShotter.findLatestSnapShotsByOrganizationId(
				createDummyOrganizationId(),
				new Date()
			);
		expect(snapShots.length).toEqual(0);
	});

	test('itShouldReturnSnapShots', async () => {
		const organizationId = createDummyOrganizationId();
		const versionedOrganization = Organization.create(
			organizationId,
			new Date()
		);
		const organizationRepo = mock<OrganizationRepository>();
		organizationRepo.findByOrganizationId.mockResolvedValue(
			versionedOrganization
		);
		const organizationSnapShotter = new OrganizationSnapShotter(
			mock<NodeRepository>(),
			organizationSnapShotRepository,
			organizationRepo,
			mock<OrganizationSnapShotFactory>(),
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const date = new Date();
		const snapShot = new OrganizationSnapShot(
			date,
			new OrganizationValidators([]),
			OrganizationContactInformation.create({
				twitter: 'twitter',
				github: 'github',
				keybase: 'keybase',
				physicalAddress: 'physicalAddress',
				dba: 'dba',
				officialEmail: 'officialEmail',
				phoneNumber: 'phoneNumber'
			})
		);
		snapShot.organization = versionedOrganization;

		organizationSnapShotRepository.findLatestByOrganization.mockResolvedValue([
			snapShot
		]);
		const snapShots =
			await organizationSnapShotter.findLatestSnapShotsByOrganizationId(
				organizationId,
				new Date()
			);
		expect(snapShots.length).toEqual(1);
	});
});
