import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain';
import NodeQuorumSet from '../NodeQuorumSet';
import NodeDetails from '../NodeDetails';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import NodeSnapShotFactory from '../snapshotting/NodeSnapShotFactory';
import Node from '../Node';
import { createDummyNode } from '../__fixtures__/createDummyNode';

describe('nodeIpPortChanged', () => {
	test('no', () => {
		const node = createDummyNode('localhost', 11625);
		const nodeDTO = new NodeDTO(node.publicKey.value, 'localhost', 11625);
		expect(
			node.currentSnapshot().nodeIpPortChanged(nodeDTO.ip, nodeDTO.port)
		).toBeFalsy();
	});
	test('ip changed', () => {
		const node = createDummyNode('localhost', 11625);
		const nodeDTO = new NodeDTO(node.publicKey.value, 'localhost2', 11625);
		expect(
			node.currentSnapshot().nodeIpPortChanged(nodeDTO.ip, nodeDTO.port)
		).toBeTruthy();
	});
	test('port changed', () => {
		const node = createDummyNode('localhost', 11625);
		const nodeDTO = new NodeDTO(node.publicKey.value, 'localhost', 11624);
		expect(
			node.currentSnapshot().nodeIpPortChanged(nodeDTO.ip, nodeDTO.port)
		).toBeTruthy();
	});
});
describe('quorumSet changed', () => {
	let nodeDTO: NodeDTO;
	let node: Node;

	beforeEach(() => {
		node = createDummyNode('localhost', 8000);
		node.currentSnapshot().quorumSet = null;
		nodeDTO = new NodeDTO(node.publicKey.value);
	});

	test('first change', () => {
		expect(
			node
				.currentSnapshot()
				.quorumSetChanged(nodeDTO.quorumSetHashKey, nodeDTO.quorumSet)
		).toBeFalsy();
		nodeDTO.quorumSetHashKey = 'key';
		nodeDTO.quorumSet.validators.push('a');
		expect(
			node
				.currentSnapshot()
				.quorumSetChanged(nodeDTO.quorumSetHashKey, nodeDTO.quorumSet)
		).toBeTruthy();
	});

	test('no change', () => {
		node.currentSnapshot().quorumSet = NodeQuorumSet.fromQuorumSetDTO(
			'key',
			nodeDTO.quorumSet
		);
		expect(
			node
				.currentSnapshot()
				.quorumSetChanged(nodeDTO.quorumSetHashKey, nodeDTO.quorumSet)
		).toBeFalsy();
	});

	test('change', () => {
		const newlyDetectedNodeDTO = new NodeDTO('pk');
		nodeDTO.quorumSet.validators.push('a');
		nodeDTO.quorumSetHashKey = 'old';
		node.currentSnapshot().quorumSet = NodeQuorumSet.fromQuorumSetDTO(
			nodeDTO.quorumSetHashKey,
			nodeDTO.quorumSet
		);
		newlyDetectedNodeDTO.quorumSetHashKey = 'new';
		expect(
			node
				.currentSnapshot()
				.quorumSetChanged(
					newlyDetectedNodeDTO.quorumSetHashKey,
					newlyDetectedNodeDTO.quorumSet
				)
		).toBeTruthy();
	});
});

describe('nodeDetails changed', () => {
	let nodeDTO: NodeDTO;
	let nodeDetailsStorage: NodeDetails;
	let node: Node;

	beforeEach(() => {
		node = createDummyNode();
		nodeDTO = new NodeDTO(node.publicKey.value);
		nodeDTO.alias = 'alias';
		nodeDTO.historyUrl = 'url';
		nodeDTO.homeDomain = 'home';
		nodeDTO.host = 'host';
		nodeDTO.isp = 'isp';
		nodeDTO.ledgerVersion = 1;
		nodeDTO.name = 'name';
		nodeDTO.overlayMinVersion = 3;
		nodeDTO.versionStr = 'v1';
		nodeDTO.overlayVersion = 5;
		nodeDetailsStorage = NodeDetails.create({
			ledgerVersion: 1,
			overlayMinVersion: 3,
			overlayVersion: 5,
			versionStr: 'v1',
			alias: 'alias',
			historyUrl: 'url',
			homeDomain: 'home',
			host: 'host',
			isp: 'isp',
			name: 'name'
		});

		node.currentSnapshot().nodeDetails = nodeDetailsStorage;
	});

	test('change', () => {
		node.currentSnapshot().nodeDetails = null;
		nodeDTO = new NodeDTO('pk');

		expect(
			node
				.currentSnapshot()
				.nodeDetailsChanged(NodeSnapShotFactory.createNodeDetails(nodeDTO))
		).toBeFalsy();
		nodeDTO.versionStr = '1.0';
		expect(
			node
				.currentSnapshot()
				.nodeDetailsChanged(NodeSnapShotFactory.createNodeDetails(nodeDTO))
		).toBeTruthy();
	});
});

describe('hasNodeChanged', () => {
	let nodeDTO: NodeDTO;
	let node: Node;

	beforeEach(() => {
		node = createDummyNode();
		nodeDTO = new NodeDTO(
			node.publicKey.value,
			node.currentSnapshot().ip ?? undefined,
			node.currentSnapshot().port ?? undefined
		);
		node.currentSnapshot().nodeDetails = null;
		node.currentSnapshot().quorumSet = null;
	});
	test('no', () => {
		expect(
			node
				.currentSnapshot()
				.hasNodeChanged(
					nodeDTO.ip,
					nodeDTO.port,
					nodeDTO.quorumSetHashKey,
					nodeDTO.quorumSet,
					NodeSnapShotFactory.createNodeDetails(nodeDTO),
					nodeDTO.organizationId,
					NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO)
				)
		).toBeFalsy();
	});
	test('ip changed', () => {
		nodeDTO.ip = 'localhost3';
		expect(
			node
				.currentSnapshot()
				.hasNodeChanged(
					nodeDTO.ip,
					nodeDTO.port,
					nodeDTO.quorumSetHashKey,
					nodeDTO.quorumSet,
					NodeSnapShotFactory.createNodeDetails(nodeDTO),
					nodeDTO.organizationId,
					NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO)
				)
		).toBeTruthy();
	});
	test('qset changed', () => {
		nodeDTO.quorumSet.validators.push('a');
		expect(
			node
				.currentSnapshot()
				.hasNodeChanged(
					nodeDTO.ip,
					nodeDTO.port,
					nodeDTO.quorumSetHashKey,
					nodeDTO.quorumSet,
					NodeSnapShotFactory.createNodeDetails(nodeDTO),
					nodeDTO.organizationId,
					NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO)
				)
		).toBeTruthy();
	});
	test('geo changed', () => {
		nodeDTO.geoData.longitude = 123;
		expect(
			node
				.currentSnapshot()
				.hasNodeChanged(
					nodeDTO.ip,
					nodeDTO.port,
					nodeDTO.quorumSetHashKey,
					nodeDTO.quorumSet,
					NodeSnapShotFactory.createNodeDetails(nodeDTO),
					nodeDTO.organizationId,
					NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO)
				)
		).toBeTruthy();
	});
	test('details', () => {
		nodeDTO.versionStr = 'newVersion';
		expect(
			node
				.currentSnapshot()
				.hasNodeChanged(
					nodeDTO.ip,
					nodeDTO.port,
					nodeDTO.quorumSetHashKey,
					nodeDTO.quorumSet,
					NodeSnapShotFactory.createNodeDetails(nodeDTO),
					nodeDTO.organizationId,
					NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO)
				)
		).toBeTruthy();
	});
});

describe('geoData changed', () => {
	let nodeDTO: NodeDTO;
	let geoDataStorage: NodeGeoDataLocation;
	let node: Node;

	beforeEach(() => {
		node = createDummyNode();

		nodeDTO = new NodeDTO(node.publicKey.value);
		nodeDTO.geoData.longitude = 2;
		nodeDTO.geoData.latitude = 1;
		nodeDTO.geoData.countryCode = 'US';
		nodeDTO.geoData.countryName = 'United States';
		geoDataStorage = NodeGeoDataLocation.create({
			longitude: 2,
			latitude: 1,
			countryCode: 'US',
			countryName: 'United States'
		});
		node.currentSnapshot().geoData = geoDataStorage;
		node.currentSnapshot().quorumSet = null;
	});

	test('change', () => {
		node.currentSnapshot().geoData = null;
		nodeDTO.geoData.longitude = null;
		nodeDTO.geoData.latitude = null;

		expect(
			node
				.currentSnapshot()
				.geoDataChanged(NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO))
		).toBeFalsy();
		nodeDTO.geoData.longitude = 1;
		expect(
			node
				.currentSnapshot()
				.geoDataChanged(NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO))
		).toBeTruthy();
		nodeDTO.geoData.latitude = 2;
		expect(
			node
				.currentSnapshot()
				.geoDataChanged(NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO))
		).toBeTruthy();
	});
});
