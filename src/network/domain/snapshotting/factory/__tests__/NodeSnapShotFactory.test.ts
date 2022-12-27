import NodeSnapShotFactory from '../NodeSnapShotFactory';
import NetworkUpdate from '../../../NetworkUpdate';
import { Node, QuorumSet } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../../../NodeSnapShot';
import NodeGeoDataStorage from '../../../NodeGeoDataStorage';
import NodeQuorumSetStorage from '../../../NodeQuorumSetStorage';
import NodeDetailsStorage from '../../../NodeDetailsStorage';
import { createDummyPublicKey } from '../../../__fixtures__/createDummyPublicKey';
import VersionedNode from '../../../VersionedNode';

describe('createNewNodeSnapShot', () => {
	let node: Node;
	const versionedNode = new VersionedNode(createDummyPublicKey());
	let networkUpdate: NetworkUpdate;
	beforeEach(() => {
		node = new Node(versionedNode.publicKey.value);
		networkUpdate = new NetworkUpdate();
	});

	test('createNewNodeSnapShot', async () => {
		node.geoData.longitude = 5;
		node.quorumSetHashKey = 'key';
		node.quorumSet = new QuorumSet(1, ['a']);
		node.versionStr = 'v1';

		const factory = new NodeSnapShotFactory();
		const newSnapShot = await factory.create(
			versionedNode,
			node,
			networkUpdate.time
		);
		const nodeSnapShot = new NodeSnapShot(
			versionedNode,
			networkUpdate.time,
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
		nodeSnapShot.organization = null;

		expect(newSnapShot).toEqual(nodeSnapShot);
	});

	test('createNewNodeSnapShotMinimal', async () => {
		const factory = new NodeSnapShotFactory();
		const nodeSnapShot = factory.create(
			versionedNode,
			node,
			networkUpdate.time
		);
		const expectedNodeStorage = new NodeSnapShot(
			versionedNode,
			networkUpdate.time,
			networkUpdate.time,
			node.ip,
			node.port
		);
		expectedNodeStorage.quorumSet = null;
		expectedNodeStorage.nodeDetails = null;
		expectedNodeStorage.organization = null;
		expect(nodeSnapShot).toEqual(expectedNodeStorage);
		expect(nodeSnapShot.quorumSet).toBeNull();
		expect(nodeSnapShot.geoData).toBeNull();
		expect(nodeSnapShot.nodeDetails).toBeNull();
	});
});
