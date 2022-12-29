import 'reflect-metadata'; //todo: create container without loading the database
import OrganizationSnapShotter from '../OrganizationSnapShotter';
import VersionedOrganization, {
	VersionedOrganizationRepository
} from '../../VersionedOrganization';
import OrganizationSnapShot from '../../OrganizationSnapShot';
import { ExceptionLoggerMock } from '../../../../core/services/__mocks__/ExceptionLoggerMock';
import { LoggerMock } from '../../../../core/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import OrganizationSnapShotFactory from '../factory/OrganizationSnapShotFactory';
import { VersionedNodeRepository } from '../../VersionedNode';
import { OrganizationSnapShotRepository } from '../OrganizationSnapShotRepository';
const organizationSnapShotRepository = mock<OrganizationSnapShotRepository>();

describe('findLatestSnapShots', () => {
	test('unknownIdShouldReturnEmptyResult', async () => {
		const versonedOrganizationRepo = mock<VersionedOrganizationRepository>();
		const organizationSnapShotter = new OrganizationSnapShotter(
			mock<VersionedNodeRepository>(),
			organizationSnapShotRepository,
			versonedOrganizationRepo,
			mock<OrganizationSnapShotFactory>(),
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const snapShots =
			await organizationSnapShotter.findLatestSnapShotsByOrganization(
				'a',
				new Date()
			);
		expect(snapShots.length).toEqual(0);
	});

	test('itShouldReturnSnapShots', async () => {
		const versionedOrganization = new VersionedOrganization('a', new Date());
		const organizationRepo = {
			findOne: () => versionedOrganization
		};
		const organizationSnapShotter = new OrganizationSnapShotter(
			{} as any,
			organizationSnapShotRepository,
			organizationRepo as any,
			{} as any,
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const date = new Date();
		const snapShot = new OrganizationSnapShot(versionedOrganization, date);
		jest
			.spyOn(organizationSnapShotRepository, 'findLatestByOrganization')
			.mockResolvedValue([snapShot]);
		const snapShots =
			await organizationSnapShotter.findLatestSnapShotsByOrganization(
				'a',
				new Date()
			);
		expect(snapShots.length).toEqual(1);
	});
});
