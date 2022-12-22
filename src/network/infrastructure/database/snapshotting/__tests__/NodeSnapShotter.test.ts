import NodeSnapShotRepository from '../../repositories/NodeSnapShotRepository';
import NodeSnapShot from '../../entities/NodeSnapShot';
import NodeSnapShotter from '../NodeSnapShotter';
import { LoggerMock } from '../../../../../core/services/__mocks__/LoggerMock';
import { ExceptionLoggerMock } from '../../../../../core/services/__mocks__/ExceptionLoggerMock';
import NodeSnapShotFactory from '../factory/NodeSnapShotFactory';
import { createDummyPublicKey } from '../../../../domain/__fixtures__/createDummyPublicKey';
import { mock } from 'jest-mock-extended';
import { PublicKeyRepository } from '../../../../domain/PublicKey';
import { OrganizationIdRepository } from '../../../../domain/OrganizationId';
const nodeSnapShotRepository = mock<NodeSnapShotRepository>();

describe('findLatestSnapShotsByNode', () => {
	test('unknownPublicKeyShouldReturnEmptyResult', async () => {
		const publicKeyStorageRepository = mock<PublicKeyRepository>();
		const nodeSnapShotter = new NodeSnapShotter(
			nodeSnapShotRepository,
			mock<NodeSnapShotFactory>(),
			publicKeyStorageRepository,
			mock<OrganizationIdRepository>(),
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const snapShots = await nodeSnapShotter.findLatestSnapShotsByNode(
			'a',
			new Date()
		);
		expect(snapShots.length).toEqual(0);
	});

	test('itShouldReturnSnapShots', async () => {
		const publicKeyStorage = createDummyPublicKey();
		const publicKeyStorageRepository = { findOne: () => publicKeyStorage };
		const nodeSnapShotter = new NodeSnapShotter(
			nodeSnapShotRepository,
			{} as NodeSnapShotFactory,
			publicKeyStorageRepository as any,
			{} as any,
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const date = new Date();
		const snapShot = new NodeSnapShot(
			publicKeyStorage,
			date,
			date,
			'localhost',
			1234
		);
		jest
			.spyOn(nodeSnapShotRepository, 'findLatestByNode')
			.mockResolvedValue([snapShot]);
		const snapShots = await nodeSnapShotter.findLatestSnapShotsByNode(
			'a',
			new Date()
		);
		expect(snapShots.length).toEqual(1);
	});
});
