import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import TypeOrmNodeSnapShotRepository from '../TypeOrmNodeSnapShotRepository';
import NodeMeasurement from '../../../../domain/node/NodeMeasurement';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyPublicKey } from '../../../../domain/node/__fixtures__/createDummyPublicKey';
import Node from '../../../../domain/node/Node';
import { NodeRepository } from '../../../../domain/node/NodeRepository';
import NodeSnapShot from '../../../../domain/node/NodeSnapShot';
import { QuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import NodeQuorumSet from '../../../../domain/node/NodeQuorumSet';
import { DataSource } from 'typeorm';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let nodeSnapShotRepository: TypeOrmNodeSnapShotRepository;
	let nodeRepository: NodeRepository;
	jest.setTimeout(160000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeSnapShotRepository = container.get(
			NETWORK_TYPES.NodeSnapshotRepository
		);
		nodeRepository = container.get(NETWORK_TYPES.NodeRepository);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findLatestByPublicKey', async () => {
		const time = new Date('2020-01-01');
		const node = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 80
		});
		node.updateQuorumSet(
			NodeQuorumSet.create('key', new QuorumSet(1, [], [])),
			new Date('2020-01-02')
		);
		await nodeRepository.save([node], time);

		const snapshots = await nodeSnapShotRepository.findLatestByPublicKey(
			node.publicKey
		);
		expect(snapshots.length).toBe(2);
		expect(
			snapshots.filter((s) => s.node.publicKey.equals(node.publicKey))
		).toHaveLength(2);
	});

	test('findLatest', async () => {
		const time = new Date('2020-01-01');
		const node = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 80
		});
		node.updateQuorumSet(
			NodeQuorumSet.create('key', new QuorumSet(1, [], [])),
			time
		);

		const node2 = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 80
		});
		node2.updateQuorumSet(
			NodeQuorumSet.create('key', new QuorumSet(1, [], [])),
			time
		);
		await nodeRepository.save([node, node2], time);

		const snapshots = await nodeSnapShotRepository.findLatest();
		expect(snapshots.length).toEqual(2);
	});

	test('archiveInActiveWithMultipleIpSamePort', async () => {
		const updateTime = new Date('2020-01-01');
		const nodeToBeArchived = Node.create(updateTime, createDummyPublicKey(), {
			ip: '127.0.0.1',
			port: 80
		});

		const nodeActive = Node.create(updateTime, createDummyPublicKey(), {
			ip: '127.0.0.1',
			port: 80
		});

		const nodeArchived = Node.create(updateTime, createDummyPublicKey(), {
			ip: '127.0.0.1',
			port: 80
		});
		nodeArchived.archive(updateTime);

		const nodeToBeLeftAlone = Node.create(updateTime, createDummyPublicKey(), {
			ip: 'other',
			port: 80
		});

		const nodeSameIpDifferentPort = Node.create(
			updateTime,
			createDummyPublicKey(),
			{
				ip: '127.0.0.1',
				port: 81
			}
		);

		const measurement = new NodeMeasurement(updateTime, nodeToBeArchived);
		measurement.isActive = false;
		nodeToBeArchived.addMeasurement(measurement);
		const measurementActive = new NodeMeasurement(updateTime, nodeActive);
		measurementActive.isActive = true;
		nodeActive.addMeasurement(measurementActive);
		const measurementArchived = new NodeMeasurement(updateTime, nodeArchived); //would not have measurement, but let's make sure it remains untouched.
		measurementArchived.isActive = false;
		nodeArchived.addMeasurement(measurementArchived);
		const measurementToBeLeftAlone = new NodeMeasurement(
			updateTime,
			nodeToBeLeftAlone
		);
		measurementToBeLeftAlone.isActive = false;
		nodeToBeLeftAlone.addMeasurement(measurementToBeLeftAlone);
		const measurementSameIpDifferentPort = new NodeMeasurement(
			updateTime,
			nodeSameIpDifferentPort
		);
		measurementSameIpDifferentPort.isActive = false;
		nodeSameIpDifferentPort.addMeasurement(measurementSameIpDifferentPort);

		await nodeRepository.save(
			[
				nodeToBeArchived,
				nodeToBeLeftAlone,
				nodeSameIpDifferentPort,
				nodeActive,
				nodeArchived
			],
			updateTime
		);

		await nodeSnapShotRepository.archiveInActiveWithMultipleIpSamePort(
			updateTime
		);
		const activeSnapshots = await nodeSnapShotRepository.findActive();
		expect(activeSnapshots.length).toEqual(3);
		const archivedNodes = await container
			.get(DataSource)
			.getRepository(NodeSnapShot)
			.find({
				where: { endDate: updateTime }
			});
		expect(archivedNodes.length).toEqual(2);
		expect(archivedNodes[0]?.node.publicKey.value).toEqual(
			nodeToBeArchived.publicKey.value
		);
	});

	test('findActiveByNodeId', async () => {
		const node = Node.create(new Date(), createDummyPublicKey(), {
			ip: 'ip',
			port: 80
		});
		node.currentSnapshot().node = node;
		await nodeSnapShotRepository.save([node.currentSnapshot()]);
		const result = await nodeSnapShotRepository.findActiveByNodeId([1]);
		expect(result).toHaveLength(1);
		expect(result[0].node).toBeDefined();
	});
});
