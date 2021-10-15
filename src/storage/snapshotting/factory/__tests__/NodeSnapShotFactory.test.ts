import NodeSnapShotFactory from '../NodeSnapShotFactory';
import NodePublicKeyStorage from '../../../entities/NodePublicKeyStorage';
import NetworkUpdate from '../../../entities/NetworkUpdate';
import { Node, QuorumSet } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../../../entities/NodeSnapShot';
import NodeGeoDataStorage from '../../../entities/NodeGeoDataStorage';
import NodeQuorumSetStorage from '../../../entities/NodeQuorumSetStorage';
import NodeDetailsStorage from '../../../entities/NodeDetailsStorage';

describe('createNewNodeSnapShot', () => {
	let node: Node;
	let networkUpdate: NetworkUpdate;
	beforeEach(() => {
		node = new Node('pk');
		networkUpdate = new NetworkUpdate();
	});

	test('createNewNodeSnapShot', async () => {
		node.geoData.longitude = 5;
		node.quorumSetHashKey = 'key';
		node.quorumSet = new QuorumSet(1, ['a']);
		node.versionStr = 'v1';

		const factory = new NodeSnapShotFactory();
		const nodeStorage = new NodePublicKeyStorage(node.publicKey);
		const newSnapShot = await factory.create(
			nodeStorage,
			node,
			networkUpdate.time
		);
		const nodeSnapShot = new NodeSnapShot(
			nodeStorage,
			networkUpdate.time,
			node.ip,
			node.port
		);
		nodeSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(
			node.quorumSetHashKey,
			node.quorumSet
		);
		nodeSnapShot.geoData = NodeGeoDataStorage.fromGeoData(node.geoData);
		nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);
		nodeSnapShot.organizationIdStorage = null;

		expect(newSnapShot).toEqual(nodeSnapShot);
	});

	test('createNewNodeSnapShotMinimal', async () => {
		const factory = new NodeSnapShotFactory();
		const nodeStorage = new NodePublicKeyStorage(node.publicKey);
		const nodeSnapShot = factory.create(nodeStorage, node, networkUpdate.time);
		const expectedNodeStorage = new NodeSnapShot(
			nodeStorage,
			networkUpdate.time,
			node.ip,
			node.port
		);
		expectedNodeStorage.quorumSet = null;
		expectedNodeStorage.nodeDetails = null;
		expectedNodeStorage.organizationIdStorage = null;
		expect(nodeSnapShot).toEqual(expectedNodeStorage);
		expect(nodeSnapShot.quorumSet).toBeNull();
		expect(nodeSnapShot.geoData).toBeNull();
		expect(nodeSnapShot.nodeDetails).toBeNull();
	});
});
