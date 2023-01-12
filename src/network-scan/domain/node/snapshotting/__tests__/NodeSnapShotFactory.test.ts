import NodeSnapShotFactory from '../NodeSnapShotFactory';
import NetworkUpdate from '../../../network/scan/NetworkUpdate';
import { Node, QuorumSet } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../../NodeSnapShot';
import NodeGeoDataLocation from '../../NodeGeoDataLocation';
import NodeQuorumSet from '../../NodeQuorumSet';
import NodeDetails from '../../NodeDetails';
import { createDummyPublicKey } from '../../__fixtures__/createDummyPublicKey';
import VersionedNode from '../../VersionedNode';

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
			node.ip,
			node.port
		);
		nodeSnapShot.quorumSet = NodeQuorumSet.fromQuorumSet(
			node.quorumSetHashKey,
			node.quorumSet
		);
		nodeSnapShot.geoData = NodeGeoDataLocation.fromGeoData(node.geoData);
		nodeSnapShot.nodeDetails = NodeDetails.fromNode(node);
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
