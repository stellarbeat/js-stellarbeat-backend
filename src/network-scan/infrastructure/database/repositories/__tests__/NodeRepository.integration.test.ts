import Node from '../../../../domain/node/Node';
import { createDummyPublicKey } from '../../../../domain/node/__fixtures__/createDummyPublicKey';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { NodeRepository } from '../../../../domain/node/NodeRepository';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import NodeMeasurement from '../../../../domain/node/NodeMeasurement';
import { createDummyNode } from '../../../../domain/node/__fixtures__/createDummyNode';
import { TestUtils } from '../../../../../core/utilities/TestUtils';
import { Connection } from 'typeorm';
import { interfaces } from 'inversify';
import Container = interfaces.Container;

describe('test queries', function () {
	let container: Container;
	let kernel: Kernel;
	let nodeRepository: NodeRepository;

	jest.setTimeout(160000); //slow integration tests

	beforeAll(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeRepository = container.get(NETWORK_TYPES.NodeRepository);
	});

	afterEach(async () => {
		await TestUtils.resetDB(kernel.container.get(Connection));
	});

	afterAll(async () => {
		await kernel.close();
	});

	test('findActive', async function () {
		const time = new Date();
		const node = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 3000
		});
		const measurement = new NodeMeasurement(time, node);
		measurement.isActive = true;
		node.addMeasurement(measurement);

		const node2 = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 3001
		});
		const measurement2 = new NodeMeasurement(time, node2);
		measurement2.isValidating = true;
		node2.addMeasurement(measurement2);

		await nodeRepository.save([node, node2]);

		const fetchedNode = await nodeRepository.findActiveByPublicKey(
			node.publicKey,
			time
		);
		expect(fetchedNode).toBeInstanceOf(Node);
		expect(fetchedNode?.currentSnapshot().node).toEqual(fetchedNode);
		expect(fetchedNode?.publicKey.equals(node.publicKey)).toBeTruthy();
		expect(fetchedNode?.latestMeasurement()?.isActive).toEqual(true);
	});

	test('findOneByPublicKey including archived nodes', async function () {
		const time = new Date('2020-01-01T00:00:00.000Z');
		const node = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 3000
		});
		const measurement = new NodeMeasurement(time, node);
		measurement.isActive = true;
		node.addMeasurement(measurement);
		node.archive(time);

		const node2 = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 3001
		});
		const measurement2 = new NodeMeasurement(time, node2);
		measurement2.isValidating = true;
		node2.addMeasurement(measurement2);

		await nodeRepository.save([node, node2]);

		const activeFetchedNode = await nodeRepository.findActiveByPublicKey(
			node.publicKey,
			time
		);
		expect(activeFetchedNode).toBeUndefined();

		const archivedFetchedNode = await nodeRepository.findOneByPublicKey(
			node.publicKey
		);
		expect(archivedFetchedNode).toBeInstanceOf(Node);
		expect(archivedFetchedNode?.currentSnapshot().node).toEqual(
			archivedFetchedNode
		);
		expect(archivedFetchedNode?.latestMeasurement()?.isActive).toEqual(true);
	});

	test('findByPublicKey', async () => {
		const node1 = createDummyNode();
		const node2 = createDummyNode();
		node2.archive(new Date('2020-01-01T00:00:00.000Z'));

		await nodeRepository.save([node1, node2]);

		const fetchedNodes = await nodeRepository.findByPublicKey([
			node1.publicKey,
			node2.publicKey
		]);
		expect(fetchedNodes).toHaveLength(2);
	});

	test('save multiple snapshots', async function () {
		const time = new Date('2020-01-01T00:00:00.000Z');
		const node = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 3000
		});
		node.addMeasurement(new NodeMeasurement(time, node));
		const updateTime = new Date('2020-02-01T00:00:01.000Z');
		node.updateIpPort('localhost', 3001, updateTime);
		node.addMeasurement(new NodeMeasurement(updateTime, node));
		await nodeRepository.save([node]);

		const fetchedNode = await nodeRepository.findOneByPublicKey(node.publicKey);
		expect(fetchedNode).toBeInstanceOf(Node);
		if (!fetchedNode) return;

		fetchedNode.updateIpPort(
			'localhost',
			3002,
			new Date('2020-03-01T00:00:02.000Z')
		);
		fetchedNode.addMeasurement(
			new NodeMeasurement(new Date('2020-03-01T00:00:02.000Z'), fetchedNode)
		);
		await nodeRepository.save([fetchedNode]);
	});

	test('save transaction', async function () {
		const publicKey = createDummyPublicKey();
		try {
			const node = Node.create(new Date(), publicKey, {
				ip: 'localhost',
				port: 3000
			});
			const node2 = Node.create(new Date(), createDummyPublicKey(), {
				ip: null as unknown as string,
				port: 3001
			});
			await nodeRepository.save([node, node2]);
		} catch (e) {
			//console.log(e);
		}

		const fetchedNode = await nodeRepository.findOneByPublicKey(publicKey);
		expect(fetchedNode).toBeUndefined();
	});

	test('findActive', async function () {
		const time = new Date('2020-01-01T00:00:00.000Z');
		const node = createDummyNode('localhost', 3000, time);
		const node2 = createDummyNode('localhost', 3001, time);
		const node3 = createDummyNode('localhost', 3002, time);
		const archivedNode = createDummyNode('localhost', 3003, time);
		archivedNode.archive(time);

		await nodeRepository.save([node, node2, node3, archivedNode]);

		const activeNodes = await nodeRepository.findActive(time);
		expect(activeNodes).toHaveLength(3);
		expect(
			activeNodes.find((n) => n.publicKey.equals(archivedNode.publicKey))
		).toBeUndefined();
	});
});
