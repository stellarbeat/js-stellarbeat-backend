import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { Node } from '@stellarbeat/js-stellar-domain';
import NodeSnapShotFactory from '../../../../domain/snapshotting/factory/NodeSnapShotFactory';
import TypeOrmNodeSnapShotRepository from '../TypeOrmNodeSnapShotRepository';
import NodeMeasurement from '../../../../domain/measurement/NodeMeasurement';
import NodeSnapShot from '../../../../domain/NodeSnapShot';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NodeMeasurementRepository } from '../../../../domain/measurement/NodeMeasurementRepository';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyPublicKey } from '../../../../domain/__fixtures__/createDummyPublicKey';
import VersionedNode, {
	VersionedNodeRepository
} from '../../../../domain/VersionedNode';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let nodeSnapShotRepository: TypeOrmNodeSnapShotRepository;
	let nodeMeasurementRepository: NodeMeasurementRepository;
	let versionedNodeRepository: VersionedNodeRepository;
	jest.setTimeout(160000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeSnapShotRepository = container.get(
			NETWORK_TYPES.NodeSnapshotRepository
		);
		versionedNodeRepository = container.get(
			NETWORK_TYPES.VersionedNodeRepository
		);
		nodeMeasurementRepository = container.get<NodeMeasurementRepository>(
			NETWORK_TYPES.NodeMeasurementRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findLatest', async () => {
		const versionedNode = new VersionedNode(createDummyPublicKey());

		const node = new Node(versionedNode.publicKey.value);
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
		const snapshot1 = nodeSnapShotFactory.create(
			versionedNode,
			node,
			initialDate
		);
		const otherPublicKey = createDummyPublicKey();
		const otherNode = new Node(otherPublicKey.value);
		otherNode.quorumSet.threshold = 1;
		otherNode.quorumSetHashKey = 'hash';
		otherNode.quorumSet.validators.push('a');
		const irrelevantSnapshot = nodeSnapShotFactory.create(
			new VersionedNode(otherPublicKey),
			otherNode,
			initialDate
		);
		await nodeSnapShotRepository.save([snapshot1, irrelevantSnapshot]);
		snapshot1.id = 1; //typeorm bug: doesn't update id...
		node.versionStr = 'v2';
		const updatedDate = new Date();
		const snapShot2 = nodeSnapShotFactory.createUpdatedSnapShot(
			snapshot1,
			node,
			updatedDate,
			null
		);
		await nodeSnapShotRepository.save([snapshot1, snapShot2]);
		let snapShots = await nodeSnapShotRepository.findLatestByNode(
			versionedNode
		);
		expect(snapShots.length).toEqual(2);
		expect(snapShots[0]?.nodeDetails?.versionStr).toEqual('v2');
		expect(snapShots[1]?.nodeDetails?.versionStr).toEqual('v1');

		snapShots = await nodeSnapShotRepository.findLatestByNode(
			versionedNode,
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
		const nodeToBeArchived = new VersionedNode(createDummyPublicKey());
		nodeToBeArchived.id = 1;
		const nodeActive = new VersionedNode(createDummyPublicKey());
		nodeActive.id = 2;
		const nodeArchived = new VersionedNode(createDummyPublicKey());
		nodeArchived.id = 3;
		const nodeToBeLeftAlone = new VersionedNode(createDummyPublicKey());
		nodeToBeLeftAlone.id = 4;
		const nodeSameIpDifferentPort = new VersionedNode(createDummyPublicKey());
		nodeSameIpDifferentPort.id = 5;
		await versionedNodeRepository.save([
			nodeToBeArchived,
			nodeToBeLeftAlone,
			nodeSameIpDifferentPort,
			nodeActive,
			nodeArchived
		]);

		const updateTime = new Date();
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

		const nodeSnapshotToBeArchived = new NodeSnapShot(
			nodeToBeArchived,
			new Date(),
			'127.0.0.1',
			80
		);
		const nodeSnapshotActive = new NodeSnapShot(
			nodeActive,
			new Date(),
			'127.0.0.1',
			80
		);
		const nodeSnapshotAlreadyArchived = new NodeSnapShot(
			nodeArchived,
			new Date(),
			'127.0.0.1',
			80
		);
		nodeSnapshotAlreadyArchived.endDate = new Date();
		const nodeSnapshotToBeLeftAlone = new NodeSnapShot(
			nodeToBeLeftAlone,
			new Date(),
			'other-host',
			80
		);
		const nodeSnapShotSameIpOtherPort = new NodeSnapShot(
			nodeSameIpDifferentPort,
			new Date(),
			'127.0.0.1',
			81
		);

		await nodeSnapShotRepository.save([
			nodeSnapshotActive,
			nodeSnapshotAlreadyArchived,
			nodeSnapshotToBeArchived,
			nodeSnapshotToBeLeftAlone,
			nodeSnapShotSameIpOtherPort
		]);

		await nodeSnapShotRepository.archiveInActiveWithMultipleIpSamePort(
			updateTime
		);
		const activeSnapshots = await nodeSnapShotRepository.findActive();
		expect(activeSnapshots.length).toEqual(3);
		const archivedNodes = await nodeSnapShotRepository.find({
			where: { endDate: updateTime }
		});
		expect(archivedNodes.length).toEqual(1);
		expect(archivedNodes[0]?.node.publicKey.value).toEqual(
			nodeToBeArchived.publicKey.value
		);
	});
	test('findActiveByNodeId', async () => {
		const snapshot = new NodeSnapShot(
			new VersionedNode(createDummyPublicKey()),
			new Date(),
			'ip',
			80
		);
		await nodeSnapShotRepository.save(snapshot);
		const result = await nodeSnapShotRepository.findActiveByNodeId([1]);
		expect(result).toHaveLength(1);
	});
});
