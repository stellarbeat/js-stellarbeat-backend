import {
	Node as NodeDTO,
	Organization as OrganizationDTO
} from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../NodeSnapShot';
import NodeQuorumSet from '../NodeQuorumSet';
import NodeDetails from '../NodeDetails';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import Organization from '../../organization/Organization';
import NodeSnapShotFactory from '../snapshotting/NodeSnapShotFactory';
import { createDummyPublicKey } from '../__fixtures__/createDummyPublicKey';
import Node from '../Node';
import { createDummyOrganizationId } from '../../organization/__fixtures__/createDummyOrganizationId';

describe('nodeIpPortChanged', () => {
	const time = new Date();
	const node = new Node(createDummyPublicKey());
	test('no', () => {
		const nodeDTO = new NodeDTO(node.publicKey.value, 'localhost', 11625);
		const snapShot = new NodeSnapShot(node, time, 'localhost', 11625);
		expect(snapShot.nodeIpPortChanged(nodeDTO.ip, nodeDTO.port)).toBeFalsy();
	});
	test('ip changed', () => {
		const nodeDTO = new NodeDTO(node.publicKey.value, 'localhost2', 11625);
		const snapShot = new NodeSnapShot(node, time, 'localhost', 11625);
		expect(snapShot.nodeIpPortChanged(nodeDTO.ip, nodeDTO.port)).toBeTruthy();
	});
	test('port changed', () => {
		const nodeDTO = new NodeDTO(node.publicKey.value, 'localhost', 11624);
		const snapShot = new NodeSnapShot(node, time, 'localhost', 11625);
		expect(snapShot.nodeIpPortChanged(nodeDTO.ip, nodeDTO.port)).toBeTruthy();
	});
});
describe('quorumSet changed', () => {
	let nodeDTO: NodeDTO;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		const node = new Node(createDummyPublicKey());
		nodeSnapShot = new NodeSnapShot(node, time, 'localhost', 8000);
		nodeSnapShot.quorumSet = null;
		nodeDTO = new NodeDTO(node.publicKey.value);
	});

	test('first change', () => {
		expect(
			nodeSnapShot.quorumSetChanged(nodeDTO.quorumSetHashKey, nodeDTO.quorumSet)
		).toBeFalsy();
		nodeDTO.quorumSetHashKey = 'key';
		nodeDTO.quorumSet.validators.push('a');
		expect(
			nodeSnapShot.quorumSetChanged(nodeDTO.quorumSetHashKey, nodeDTO.quorumSet)
		).toBeTruthy();
	});

	test('no change', () => {
		nodeSnapShot.quorumSet = NodeQuorumSet.fromQuorumSetDTO(
			'key',
			nodeDTO.quorumSet
		);
		expect(
			nodeSnapShot.quorumSetChanged(nodeDTO.quorumSetHashKey, nodeDTO.quorumSet)
		).toBeFalsy();
	});

	test('change', () => {
		const newlyDetectedNodeDTO = new NodeDTO('pk');
		nodeDTO.quorumSet.validators.push('a');
		nodeDTO.quorumSetHashKey = 'old';
		nodeSnapShot.quorumSet = NodeQuorumSet.fromQuorumSetDTO(
			nodeDTO.quorumSetHashKey,
			nodeDTO.quorumSet
		);
		newlyDetectedNodeDTO.quorumSetHashKey = 'new';
		expect(
			nodeSnapShot.quorumSetChanged(
				newlyDetectedNodeDTO.quorumSetHashKey,
				newlyDetectedNodeDTO.quorumSet
			)
		).toBeTruthy();
	});
});

describe('nodeDetails changed', () => {
	let nodeDTO: NodeDTO;
	let nodeDetailsStorage: NodeDetails;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		const node = new Node(createDummyPublicKey());
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

		nodeSnapShot = new NodeSnapShot(node, time, 'localhost', 8000);
		nodeSnapShot.nodeDetails = nodeDetailsStorage;
	});

	test('change', () => {
		nodeSnapShot.nodeDetails = null;
		nodeDTO = new NodeDTO('pk');

		expect(
			nodeSnapShot.nodeDetailsChanged(
				NodeSnapShotFactory.createNodeDetails(nodeDTO)
			)
		).toBeFalsy();
		nodeDTO.versionStr = '1.0';
		expect(
			nodeSnapShot.nodeDetailsChanged(
				NodeSnapShotFactory.createNodeDetails(nodeDTO)
			)
		).toBeTruthy();
	});
});

describe('hasNodeChanged', () => {
	let nodeDTO: NodeDTO;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		const node = new Node(createDummyPublicKey());
		nodeDTO = new NodeDTO(node.publicKey.value);
		nodeSnapShot = new NodeSnapShot(node, time, nodeDTO.ip, nodeDTO.port);
		nodeSnapShot.nodeDetails = null;
		nodeSnapShot.quorumSet = null;
		nodeSnapShot.organization = null;
	});
	test('no', () => {
		expect(
			nodeSnapShot.hasNodeChanged(
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
			nodeSnapShot.hasNodeChanged(
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
			nodeSnapShot.hasNodeChanged(
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
			nodeSnapShot.hasNodeChanged(
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
			nodeSnapShot.hasNodeChanged(
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
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		const node = new Node(createDummyPublicKey());

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
		nodeSnapShot = new NodeSnapShot(node, time, 'localhost', 8000);
		nodeSnapShot.geoData = geoDataStorage;
		nodeSnapShot.quorumSet = null;
	});

	test('change', () => {
		nodeSnapShot.geoData = null;
		nodeDTO.geoData.longitude = null;
		nodeDTO.geoData.latitude = null;

		expect(
			nodeSnapShot.geoDataChanged(
				NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO)
			)
		).toBeFalsy();
		nodeDTO.geoData.longitude = 1;
		expect(
			nodeSnapShot.geoDataChanged(
				NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO)
			)
		).toBeTruthy();
		nodeDTO.geoData.latitude = 2;
		expect(
			nodeSnapShot.geoDataChanged(
				NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO)
			)
		).toBeTruthy();
	});
});

describe('organization changed', () => {
	let nodeDTO: NodeDTO;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();
	let organizationDTO: OrganizationDTO;
	let organization: Organization;

	beforeEach(() => {
		const node = new Node(createDummyPublicKey());
		nodeDTO = new NodeDTO(node.publicKey.value);
		nodeSnapShot = new NodeSnapShot(node, time, nodeDTO.ip, nodeDTO.port);
		nodeSnapShot.organization = null;
		nodeSnapShot.nodeDetails = null;
		const organizationId = createDummyOrganizationId();
		organizationDTO = new OrganizationDTO(organizationId.value, 'orgName');
		nodeDTO.organizationId = organizationDTO.id;
		organization = new Organization(organizationId, time);
		nodeSnapShot.organization = null;
		nodeSnapShot.quorumSet = null;
	});

	test('first change', () => {
		expect(
			nodeSnapShot.organizationChanged(nodeDTO.organizationId)
		).toBeTruthy();
		expect(
			nodeSnapShot.hasNodeChanged(
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

	test('no change', () => {
		nodeSnapShot.organization = organization;
		expect(
			nodeSnapShot.organizationChanged(nodeDTO.organizationId)
		).toBeFalsy();
		expect(
			nodeSnapShot.hasNodeChanged(
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
});
