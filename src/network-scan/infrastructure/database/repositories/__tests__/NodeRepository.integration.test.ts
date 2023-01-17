import Node from '../../../../domain/node/Node';
import { createDummyPublicKey } from '../../../../domain/node/__fixtures__/createDummyPublicKey';
import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { NodeRepository } from '../../../../domain/node/NodeRepository';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import TypeOrmNodeSnapShotRepository from '../TypeOrmNodeSnapShotRepository';

describe('test queries', function () {
	let container: Container;
	let kernel: Kernel;
	let nodeRepository: NodeRepository;
	let nodeSnapShotRepository: TypeOrmNodeSnapShotRepository;

	jest.setTimeout(160000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeRepository = container.get(NETWORK_TYPES.NodeRepository);
		nodeSnapShotRepository = container.get(
			NETWORK_TYPES.NodeSnapshotRepository
		);
	});

	test('findActive', async function () {
		const node = Node.create(new Date(), createDummyPublicKey(), {
			ip: 'localhost',
			port: 3000,
			geoData: null,
			quorumSet: null,
			details: null
		});
		const node2 = Node.create(new Date(), createDummyPublicKey(), {
			ip: 'localhost',
			port: 3001,
			geoData: null,
			quorumSet: null,
			details: null
		});
		await nodeRepository.save([node, node2]);
		await nodeSnapShotRepository.save([...node.snapshots, ...node2.snapshots]);

		const fetchedNode = await nodeRepository.findActiveByPublicKey(
			node.publicKey
		);
		expect(fetchedNode).toBeInstanceOf(Node);
		expect(fetchedNode?.currentSnapshot().node).toEqual(fetchedNode);
		expect(fetchedNode?.publicKey.equals(node.publicKey)).toBeTruthy();
	});

	test('findArchived', async function () {
		const node = Node.create(new Date(), createDummyPublicKey(), {
			ip: 'localhost',
			port: 3000,
			geoData: null,
			quorumSet: null,
			details: null
		});
		node.archive(new Date());

		const node2 = Node.create(new Date(), createDummyPublicKey(), {
			ip: 'localhost',
			port: 3001,
			geoData: null,
			quorumSet: null,
			details: null
		});

		await nodeRepository.save([node, node2]);
		await nodeSnapShotRepository.save([...node.snapshots, ...node2.snapshots]);

		const activeFetchedNode = await nodeRepository.findActiveByPublicKey(
			node.publicKey
		);
		expect(activeFetchedNode).toBeUndefined();

		const archivedFetchedNode = await nodeRepository.findOneByPublicKey(
			node.publicKey
		);
		expect(archivedFetchedNode).toBeInstanceOf(Node);
		expect(archivedFetchedNode?.currentSnapshot().node).toEqual(
			archivedFetchedNode
		);
	});
});
