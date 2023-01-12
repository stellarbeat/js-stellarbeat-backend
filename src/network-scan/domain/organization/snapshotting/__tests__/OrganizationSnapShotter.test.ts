import 'reflect-metadata'; //todo: create container without loading the database
import OrganizationSnapShotter from '../OrganizationSnapShotter';
import VersionedOrganization from '../../VersionedOrganization';
import OrganizationSnapShot from '../../OrganizationSnapShot';
import { ExceptionLoggerMock } from '../../../../../core/services/__mocks__/ExceptionLoggerMock';
import { LoggerMock } from '../../../../../core/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import OrganizationSnapShotFactory from '../OrganizationSnapShotFactory';
import { VersionedNodeRepository } from '../../../node/VersionedNode';
import { OrganizationSnapShotRepository } from '../OrganizationSnapShotRepository';
import { createDummyOrganizationId } from '../../__fixtures__/createDummyOrganizationId';
import { VersionedOrganizationRepository } from '../../VersionedOrganizationRepository';
const organizationSnapShotRepository = mock<OrganizationSnapShotRepository>();

describe('findLatestSnapShots', () => {
	test('unknownIdShouldReturnEmptyResult', async () => {
		const versionedOrganizationRepo = mock<VersionedOrganizationRepository>();
		const organizationSnapShotter = new OrganizationSnapShotter(
			mock<VersionedNodeRepository>(),
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
		const versionedOrganization = new VersionedOrganization(
			organizationId,
			new Date()
		);
		const organizationRepo = mock<VersionedOrganizationRepository>();
		organizationRepo.findByOrganizationId.mockResolvedValue(
			versionedOrganization
		);
		const organizationSnapShotter = new OrganizationSnapShotter(
			mock<VersionedNodeRepository>(),
			organizationSnapShotRepository,
			organizationRepo,
			mock<OrganizationSnapShotFactory>(),
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const date = new Date();
		const snapShot = new OrganizationSnapShot(versionedOrganization, date);
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
