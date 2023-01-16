import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain';
import NodeSnapShotFactory from '../../../../domain/node/snapshotting/NodeSnapShotFactory';
import TypeOrmNodeSnapShotRepository from '../TypeOrmNodeSnapShotRepository';
import NodeMeasurement from '../../../../domain/node/NodeMeasurement';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NodeMeasurementRepository } from '../../../../domain/node/NodeMeasurementRepository';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyPublicKey } from '../../../../domain/node/__fixtures__/createDummyPublicKey';
import Node from '../../../../domain/node/Node';
import { NodeRepository } from '../../../../domain/node/NodeRepository';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let nodeSnapShotRepository: TypeOrmNodeSnapShotRepository;
	let nodeMeasurementRepository: NodeMeasurementRepository;
	let versionedNodeRepository: NodeRepository;
	jest.setTimeout(160000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeSnapShotRepository = container.get(
			NETWORK_TYPES.NodeSnapshotRepository
		);
		versionedNodeRepository = container.get(NETWORK_TYPES.NodeRepository);
		nodeMeasurementRepository = container.get<NodeMeasurementRepository>(
			NETWORK_TYPES.NodeMeasurementRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findLatest', async () => {
		const publicKey = createDummyPublicKey();

		const node = new NodeDTO(publicKey.value);
		node.quorumSet.threshold = 1;
		node.quorumSetHashKey = 'hash';
		node.quorumSet.validators.push('a');
		node.geoData.countryCode = 'US';
		node.geoData.countryName = 'United States';
		node.geoData.longitude = 1;
		node.geoData.latitude = 1;
		node.versionStr = 'v1';
		const nodeSnapShotFactory = container.get(NodeSnapShotFactory);
		const initialDate = new Date();
		const snapshot1 = nodeSnapShotFactory.create(publicKey, node, initialDate);
		const otherPublicKey = createDummyPublicKey();
		const otherNode = new NodeDTO(otherPublicKey.value);
		otherNode.quorumSet.threshold = 1;
		otherNode.quorumSetHashKey = 'hash';
		otherNode.quorumSet.validators.push('a');
		const irrelevantSnapshot = nodeSnapShotFactory.create(
			otherPublicKey,
			otherNode,
			initialDate
		);
		await nodeSnapShotRepository.save([snapshot1, irrelevantSnapshot]);
		node.versionStr = 'v2';
		const updatedDate = new Date();
		const snapShot2 = nodeSnapShotFactory.createUpdatedSnapShot(
			snapshot1,
			node,
			updatedDate
		);
		await nodeSnapShotRepository.save([snapshot1, snapShot2]);
		let snapShots = await nodeSnapShotRepository.findLatestByNode(
			snapshot1.node
		);
		expect(snapShots.length).toEqual(2);
		expect(snapShots[0]?.nodeDetails?.versionStr).toEqual('v2');
		expect(snapShots[1]?.nodeDetails?.versionStr).toEqual('v1');

		snapShots = await nodeSnapShotRepository.findLatestByNode(
			snapshot1.node,
			initialDate
		);
		expect(snapShots.length).toEqual(1);
		expect(snapShots[0]?.nodeDetails?.versionStr).toEqual('v1');
		const networkSnapShots = await nodeSnapShotRepository.findLatest(
			initialDate
		);
		expect(networkSnapShots).toHaveLength(2);
	});

	test('archiveInActiveWithMultipleIpSamePort', async () => {
		const updateTime = new Date();
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
		nodeArchived.archive();

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

		await versionedNodeRepository.save([
			nodeToBeArchived,
			nodeToBeLeftAlone,
			nodeSameIpDifferentPort,
			nodeActive,
			nodeArchived
		]);

		const measurement = new NodeMeasurement(updateTime, nodeToBeArchived);
		measurement.isActive = false;
		const measurementActive = new NodeMeasurement(updateTime, nodeActive);
		measurementActive.isActive = true;
		const measurementArchived = new NodeMeasurement(updateTime, nodeArchived); //would not have measurement, but let's make sure it remains untouched.
		measurementArchived.isActive = false;
		const measurementToBeLeftAlone = new NodeMeasurement(
			updateTime,
			nodeToBeLeftAlone
		);
		measurementToBeLeftAlone.isActive = false;
		const measurementSameIpDifferentPort = new NodeMeasurement(
			updateTime,
			nodeSameIpDifferentPort
		);
		measurementSameIpDifferentPort.isActive = false;
		await nodeMeasurementRepository.save([
			measurement,
			measurementActive,
			measurementArchived,
			measurementToBeLeftAlone,
			measurementSameIpDifferentPort
		]);

		await nodeSnapShotRepository.save([
			nodeActive.currentSnapshot(),
			nodeArchived.currentSnapshot(),
			nodeToBeArchived.currentSnapshot(),
			nodeToBeLeftAlone.currentSnapshot(),
			nodeSameIpDifferentPort.currentSnapshot()
		]);

		await nodeSnapShotRepository.archiveInActiveWithMultipleIpSamePort(
			updateTime
		);
		const activeSnapshots = await nodeSnapShotRepository.findActive();
		expect(activeSnapshots.length).toEqual(3);
		const archivedNodes = await nodeSnapShotRepository.find({
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
		await nodeSnapShotRepository.save(node.currentSnapshot());
		const result = await nodeSnapShotRepository.findActiveByNodeId([1]);
		expect(result).toHaveLength(1);
	});
});
