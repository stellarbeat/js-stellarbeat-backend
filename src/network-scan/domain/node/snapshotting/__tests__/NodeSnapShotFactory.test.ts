import NodeSnapShotFactory from '../NodeSnapShotFactory';
import NetworkScan from '../../../network/scan/NetworkScan';
import { Node as NodeDTO, QuorumSet } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../../NodeSnapShot';
import NodeGeoDataLocation from '../../NodeGeoDataLocation';
import NodeQuorumSet from '../../NodeQuorumSet';
import { createDummyPublicKey } from '../../__fixtures__/createDummyPublicKey';

describe('createNewNodeSnapShot', () => {
	let node: NodeDTO;

	const publicKey = createDummyPublicKey();
	let networkScan: NetworkScan;
	beforeEach(() => {
		node = new NodeDTO(publicKey.value);
		networkScan = new NetworkScan();
	});

	test('createNewNodeSnapShot', async () => {
		node.geoData.longitude = 5;
		node.quorumSetHashKey = 'key';
		node.quorumSet = new QuorumSet(1, ['a']);
		node.versionStr = 'v1';

		const factory = new NodeSnapShotFactory();
		const newSnapShot = await factory.create(publicKey, node, networkScan.time);

		const nodeSnapShot = new NodeSnapShot(networkScan.time, node.ip, node.port);
		nodeSnapShot.node = newSnapShot.node;
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

		expect(newSnapShot).toEqual(nodeSnapShot);
	});

	test('createNewNodeSnapShotMinimal', async () => {
		const factory = new NodeSnapShotFactory();
		const nodeSnapShot = factory.create(publicKey, node, networkScan.time);
		const expectedNodeStorage = new NodeSnapShot(
			networkScan.time,
			node.ip,
			node.port
		);
		expectedNodeStorage.node = nodeSnapShot.node;
		expectedNodeStorage.quorumSet = null;
		expectedNodeStorage.nodeDetails =
			NodeSnapShotFactory.createNodeDetails(node);
		expect(nodeSnapShot).toEqual(expectedNodeStorage);
		expect(nodeSnapShot.quorumSet).toBeNull();
		expect(nodeSnapShot.geoData).toBeNull();
		expect(nodeSnapShot.nodeDetails).toEqual(
			NodeSnapShotFactory.createNodeDetails(node)
		);
	});
});
