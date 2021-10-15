import NodeSnapShotRepository from '../../../repositories/NodeSnapShotRepository';
import NodeSnapShot from '../../../entities/NodeSnapShot';
import NodePublicKeyStorage from '../../../entities/NodePublicKeyStorage';
import NodeSnapShotter from '../NodeSnapShotter';
import { LoggerMock } from '../../__mocks__/LoggerMock';
import { ExceptionLoggerMock } from '../../__mocks__/ExceptionLoggerMock';
import NodeSnapShotFactory from '../../../factory/NodeSnapShotFactory';
const nodeSnapShotRepository = new NodeSnapShotRepository();

describe('findLatestSnapShotsByNode', () => {
	test('unknownPublicKeyShouldReturnEmptyResult', async () => {
		const publicKeyStorageRepository = { findOne: () => undefined };
		const nodeSnapShotter = new NodeSnapShotter(
			nodeSnapShotRepository,
			{} as NodeSnapShotFactory,
			publicKeyStorageRepository as any,
			{} as any,
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
		const publicKeyStorage = new NodePublicKeyStorage('a');
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
