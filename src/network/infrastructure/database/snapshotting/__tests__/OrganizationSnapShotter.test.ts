import 'reflect-metadata'; //todo: create container without loading the database
import OrganizationSnapShotter from '../OrganizationSnapShotter';
import OrganizationSnapShotRepository from '../../repositories/OrganizationSnapShotRepository';
import OrganizationId from '../../../../domain/OrganizationId';
import OrganizationSnapShot from '../../entities/OrganizationSnapShot';
import { ExceptionLoggerMock } from '../../../../../core/services/__mocks__/ExceptionLoggerMock';
import { LoggerMock } from '../../../../../core/services/__mocks__/LoggerMock';
const organizationSnapShotRepository = new OrganizationSnapShotRepository();

describe('findLatestSnapShots', () => {
	test('unknownIdShouldReturnEmptyResult', async () => {
		const organizationIdStorageRepository = { findOne: () => undefined };
		const organizationSnapShotter = new OrganizationSnapShotter(
			{} as any,
			organizationSnapShotRepository as any,
			organizationIdStorageRepository as any,
			{} as any,
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
