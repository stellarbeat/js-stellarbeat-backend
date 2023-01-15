import NodeSnapShotter from '../NodeSnapShotter';
import { LoggerMock } from '../../../../../core/services/__mocks__/LoggerMock';
import { ExceptionLoggerMock } from '../../../../../core/services/__mocks__/ExceptionLoggerMock';
import NodeSnapShotFactory from '../NodeSnapShotFactory';
import { createDummyPublicKey } from '../../__fixtures__/createDummyPublicKey';
import { mock } from 'jest-mock-extended';
import Node from '../../Node';
import { NodeSnapShotRepository } from '../../NodeSnapShotRepository';
import { OrganizationRepository } from '../../../organization/OrganizationRepository';
import { NodeRepository } from '../../NodeRepository';
const nodeSnapShotRepository = mock<NodeSnapShotRepository>();

describe('findLatestSnapShotsByNode', () => {
	test('unknownPublicKeyShouldReturnEmptyResult', async () => {
		const nodeRepository = mock<NodeRepository>();
		const nodeSnapShotter = new NodeSnapShotter(
			nodeSnapShotRepository as NodeSnapShotRepository,
			mock<NodeSnapShotFactory>(),
			nodeRepository,
			mock<OrganizationRepository>(),
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
		const nodeRepository = mock<NodeRepository>();
		const nodeSnapShotter = new NodeSnapShotter(
			nodeSnapShotRepository,
			mock<NodeSnapShotFactory>(),
			nodeRepository,
			mock<OrganizationRepository>(),
			new ExceptionLoggerMock(),
			new LoggerMock()
		);
		const date = new Date();
		const node = Node.create(date, publicKey, { ip: 'localhost', port: 1234 });
		nodeRepository.findOneByPublicKey.mockResolvedValueOnce(node);

		jest
			.spyOn(nodeSnapShotRepository, 'findLatestByNode')
			.mockResolvedValue([node.currentSnapshot()]);
		const snapShots = await nodeSnapShotter.findLatestSnapShotsByNode(
			publicKey,
			new Date()
		);
		expect(snapShots.length).toEqual(1);
	});
});
