import NodeSnapShotFactory from '../NodeSnapShotFactory';
import NetworkScan from '../../../network/scan/NetworkScan';
import { Node as NodeDTO, QuorumSet } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../../NodeSnapShot';
import NodeGeoDataLocation from '../../NodeGeoDataLocation';
import NodeQuorumSet from '../../NodeQuorumSet';
import { createDummyPublicKey } from '../../__fixtures__/createDummyPublicKey';
import Node from '../../Node';

describe('createNewNodeSnapShot', () => {
	let node: NodeDTO;
	const versionedNode = new Node(createDummyPublicKey());
	let networkScan: NetworkScan;
	beforeEach(() => {
		node = new NodeDTO(versionedNode.publicKey.value);
		networkScan = new NetworkScan();
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
			networkScan.time
		);
		const nodeSnapShot = new NodeSnapShot(
			versionedNode,
			networkScan.time,
			node.ip,
			node.port
		);
		nodeSnapShot.quorumSet = NodeQuorumSet.fromQuorumSetDTO(
			node.quorumSetHashKey,
			node.quorumSet
		);
		nodeSnapShot.geoData = NodeGeoDataLocation.create({
			latitude: node.geoData.latitude,
			longitude: node.geoData.longitude,
			countryName: node.geoData.countryName,
			countryCode: node.geoData.countryCode
		});
		nodeSnapShot.nodeDetails = NodeSnapShotFactory.createNodeDetails(node);
		nodeSnapShot.organization = null;

		expect(newSnapShot).toEqual(nodeSnapShot);
	});

	test('createNewNodeSnapShotMinimal', async () => {
		const factory = new NodeSnapShotFactory();
		const nodeSnapShot = factory.create(versionedNode, node, networkScan.time);
		const expectedNodeStorage = new NodeSnapShot(
			versionedNode,
			networkScan.time,
			node.ip,
			node.port
		);
		expectedNodeStorage.quorumSet = null;
		expectedNodeStorage.nodeDetails =
			NodeSnapShotFactory.createNodeDetails(node);
		expectedNodeStorage.organization = null;
		expect(nodeSnapShot).toEqual(expectedNodeStorage);
		expect(nodeSnapShot.quorumSet).toBeNull();
		expect(nodeSnapShot.geoData).toBeNull();
		expect(nodeSnapShot.nodeDetails).toEqual(
			NodeSnapShotFactory.createNodeDetails(node)
		);
	});
});
