import NodeSnapShotRepository from '../../repositories/NodeSnapShotRepository';
import NodeSnapShot from '../../entities/NodeSnapShot';
import NodeSnapShotter from '../NodeSnapShotter';
import { LoggerMock } from '../../../../../core/services/__mocks__/LoggerMock';
import { ExceptionLoggerMock } from '../../../../../core/services/__mocks__/ExceptionLoggerMock';
import NodeSnapShotFactory from '../factory/NodeSnapShotFactory';
import { createDummyPublicKey } from '../../../../domain/__fixtures__/createDummyPublicKey';
import { mock } from 'jest-mock-extended';
import { OrganizationIdRepository } from '../../../../domain/OrganizationId';
import VersionedNode, {
	VersionedNodeRepository
} from '../../entities/VersionedNode';
const nodeSnapShotRepository = mock<NodeSnapShotRepository>();

describe('findLatestSnapShotsByNode', () => {
	test('unknownPublicKeyShouldReturnEmptyResult', async () => {
		const versionedNodeRepository = mock<VersionedNodeRepository>();
		const nodeSnapShotter = new NodeSnapShotter(
			nodeSnapShotRepository,
			mock<NodeSnapShotFactory>(),
			versionedNodeRepository,
			mock<OrganizationIdRepository>(),
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const snapShots = await nodeSnapShotter.findLatestSnapShotsByNode(
			createDummyPublicKey(),
			new Date()
		);
		expect(snapShots.length).toEqual(0);
	});

	test('itShouldReturnSnapShots', async () => {
		const publicKey = createDummyPublicKey();
		const publicKeyStorageRepository = { findOne: () => publicKey };
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
			new VersionedNode(publicKey),
			date,
			date,
			'localhost',
			1234
		);
		jest
			.spyOn(nodeSnapShotRepository, 'findLatestByNode')
			.mockResolvedValue([snapShot]);
		const snapShots = await nodeSnapShotter.findLatestSnapShotsByNode(
			publicKey,
			new Date()
		);
		expect(snapShots.length).toEqual(1);
	});
});
