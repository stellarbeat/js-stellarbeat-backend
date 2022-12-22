import 'reflect-metadata'; //todo: create container without loading the database
import OrganizationSnapShotter from '../OrganizationSnapShotter';
import OrganizationSnapShotRepository from '../../repositories/OrganizationSnapShotRepository';
import OrganizationId, {
	OrganizationIdRepository
} from '../../../../domain/OrganizationId';
import OrganizationSnapShot from '../../entities/OrganizationSnapShot';
import { ExceptionLoggerMock } from '../../../../../core/services/__mocks__/ExceptionLoggerMock';
import { LoggerMock } from '../../../../../core/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import { PublicKeyRepository } from '../../../../domain/PublicKey';
import OrganizationSnapShotFactory from '../factory/OrganizationSnapShotFactory';
const organizationSnapShotRepository = mock<OrganizationSnapShotRepository>();

describe('findLatestSnapShots', () => {
	test('unknownIdShouldReturnEmptyResult', async () => {
		const organizationIdStorageRepository = mock<OrganizationIdRepository>();
		const organizationSnapShotter = new OrganizationSnapShotter(
			mock<PublicKeyRepository>(),
			organizationSnapShotRepository,
			organizationIdStorageRepository,
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
		const organizationIdStorage = new OrganizationId('a', new Date());
		const organizationIdStorageRepository = {
			findOne: () => organizationIdStorage
		};
		const organizationSnapShotter = new OrganizationSnapShotter(
			{} as any,
			organizationSnapShotRepository,
			organizationIdStorageRepository as any,
			{} as any,
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const date = new Date();
		const snapShot = new OrganizationSnapShot(organizationIdStorage, date);
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
