import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { Node } from '@stellarbeat/js-stellar-domain';
import NodeSnapShotFactory from '../../snapshotting/factory/NodeSnapShotFactory';
import PublicKey, { PublicKeyRepository } from '../../../../domain/PublicKey';
import NodeSnapShotRepository from '../NodeSnapShotRepository';
import NodeMeasurement from '../../../../domain/measurement/NodeMeasurement';
import NodeSnapShot from '../../entities/NodeSnapShot';
import { NodeMeasurementRepository } from '../NodeMeasurementRepository';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let nodeSnapShotRepository: NodeSnapShotRepository;
	let nodeMeasurementV2Repository: NodeMeasurementRepository;
	let publicKeyRepository: PublicKeyRepository;
	jest.setTimeout(160000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeSnapShotRepository = container.get(NodeSnapShotRepository);
		publicKeyRepository = container.get('NodePublicKeyStorageRepository');
		nodeMeasurementV2Repository = container.get(NodeMeasurementRepository);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findLatest', async () => {
		const node = new Node('a');
		node.quorumSet.threshold = 1;
		node.quorumSetHashKey = 'hash';
		node.quorumSet.validators.push('a');
		node.geoData.countryCode = 'US';
		node.geoData.countryName = 'United States';
		node.geoData.longitude = 1;
		node.geoData.latitude = 1;
		node.versionStr = 'v1';
		const nodeSnapShotFactory = container.get(NodeSnapShotFactory);
		const publicKeyStorage = new PublicKey(node.publicKey);
		const initialDate = new Date();
		const snapshot1 = nodeSnapShotFactory.create(
			publicKeyStorage,
			node,
			initialDate
		);
		const otherNode = new Node('b');
		otherNode.quorumSet.threshold = 1;
		otherNode.quorumSetHashKey = 'hash';
		otherNode.quorumSet.validators.push('a');
		const irrelevantSnapshot = nodeSnapShotFactory.create(
			new PublicKey(otherNode.publicKey),
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
			publicKeyStorage
		);
		expect(snapShots.length).toEqual(2);
		expect(snapShots[0]!.nodeDetails!.versionStr).toEqual('v2');
		expect(snapShots[1]!.nodeDetails!.versionStr).toEqual('v1');

		snapShots = await nodeSnapShotRepository.findLatestByNode(
			publicKeyStorage,
			initialDate
		);
		expect(snapShots.length).toEqual(1);
		expect(snapShots[0]!.nodeDetails!.versionStr).toEqual('v1');
		const networkSnapShots = await nodeSnapShotRepository.findLatest(
			initialDate
		);
		expect(networkSnapShots).toHaveLength(2);
	});

	test('archiveInActiveWithMultipleIpSamePort', async () => {
		const nodePublicKeyStorageToBeArchived = new PublicKey('a');
		nodePublicKeyStorageToBeArchived.id = 1;
		const nodePublicKeyStorageActive = new PublicKey('b');
		nodePublicKeyStorageActive.id = 2;
		const nodePublicKeyArchived = new PublicKey('c');
		nodePublicKeyArchived.id = 3;
		const nodePublicKeyStorageToBeLeftAlone = new PublicKey('d');
		nodePublicKeyStorageToBeLeftAlone.id = 4;
		const nodePublicKeyStorageSameIpDifferentPort = new PublicKey('e');
		nodePublicKeyStorageSameIpDifferentPort.id = 5;
		await publicKeyRepository.save([
			nodePublicKeyStorageToBeArchived,
			nodePublicKeyStorageToBeLeftAlone,
			nodePublicKeyStorageSameIpDifferentPort,
			nodePublicKeyStorageActive,
			nodePublicKeyArchived
		]);

		const updateTime = new Date();
		const measurement = new NodeMeasurement(
			updateTime,
			nodePublicKeyStorageToBeArchived
		);
		measurement.isActive = false;
		const measurementActive = new NodeMeasurement(
			updateTime,
			nodePublicKeyStorageActive
		);
		measurementActive.isActive = true;
		const measurementArchived = new NodeMeasurement(
			updateTime,
			nodePublicKeyArchived
		); //would not have measurement, but lets make sure it remains untouched.
		measurementArchived.isActive = false;
		const measurementToBeLeftAlone = new NodeMeasurement(
			updateTime,
			nodePublicKeyStorageToBeLeftAlone
		);
		measurementToBeLeftAlone.isActive = false;
		const measurementSameIpDifferentPort = new NodeMeasurement(
			updateTime,
			nodePublicKeyStorageSameIpDifferentPort
		);
		measurementSameIpDifferentPort.isActive = false;
		await nodeMeasurementV2Repository.save([
			measurement,
			measurementActive,
			measurementArchived,
			measurementToBeLeftAlone,
			measurementSameIpDifferentPort
		]);

		const nodeSnapshotToBeArchived = new NodeSnapShot(
			nodePublicKeyStorageToBeArchived,
			new Date(),
			'127.0.0.1',
			80
		);
		const nodeSnapshotActive = new NodeSnapShot(
			nodePublicKeyStorageActive,
			new Date(),
			'127.0.0.1',
			80
		);
		const nodeSnapshotAlreadyArchived = new NodeSnapShot(
			nodePublicKeyArchived,
			new Date(),
			'127.0.0.1',
			80
		);
		nodeSnapshotAlreadyArchived.endDate = new Date();
		const nodeSnapshotToBeLeftAlone = new NodeSnapShot(
			nodePublicKeyStorageToBeLeftAlone,
			new Date(),
			'otherhost',
			80
		);
		const nodeSnapShotSameIpOtherPort = new NodeSnapShot(
			nodePublicKeyStorageSameIpDifferentPort,
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
		expect(archivedNodes[0]!.nodePublicKey.publicKey).toEqual('a');
	});
});
