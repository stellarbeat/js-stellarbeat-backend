import {
	Node as NodeDTO,
	Organization as OrganizationDTO,
	QuorumSet
} from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../NodeSnapShot';
import NodeQuorumSet from '../NodeQuorumSet';
import NodeDetails from '../NodeDetails';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import Organization from '../../organization/Organization';
import NodeSnapShotFactory from '../snapshotting/NodeSnapShotFactory';
import NodeMeasurement from '../NodeMeasurement';
import { NodeMeasurementAverage } from '../NodeMeasurementAverage';
import { createDummyPublicKey } from '../__fixtures__/createDummyPublicKey';
import Node from '../Node';
import { createDummyOrganizationId } from '../../organization/__fixtures__/createDummyOrganizationId';

describe('nodeIpPortChanged', () => {
	const time = new Date();
	const node = new Node(createDummyPublicKey());
	test('no', () => {
		const nodeDTO = new NodeDTO(node.publicKey.value, 'localhost', 11625);
		const snapShot = new NodeSnapShot(node, time, 'localhost', 11625);
		expect(snapShot.nodeIpPortChanged(nodeDTO)).toBeFalsy();
	});
	test('ip changed', () => {
		const nodeDTO = new NodeDTO(node.publicKey.value, 'localhost2', 11625);
		const snapShot = new NodeSnapShot(node, time, 'localhost', 11625);
		expect(snapShot.nodeIpPortChanged(nodeDTO)).toBeTruthy();
	});
	test('port changed', () => {
		const nodeDTO = new NodeDTO(node.publicKey.value, 'localhost', 11624);
		const snapShot = new NodeSnapShot(node, time, 'localhost', 11625);
		expect(snapShot.nodeIpPortChanged(nodeDTO)).toBeTruthy();
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
		expect(nodeSnapShot.quorumSetChanged(nodeDTO)).toBeFalsy();
		nodeDTO.quorumSetHashKey = 'key';
		nodeDTO.quorumSet.validators.push('a');
		expect(nodeSnapShot.quorumSetChanged(nodeDTO)).toBeTruthy();
	});

	test('no change', () => {
		nodeSnapShot.quorumSet = NodeQuorumSet.fromQuorumSetDTO(
			'key',
			nodeDTO.quorumSet
		);
		expect(nodeSnapShot.quorumSetChanged(nodeDTO)).toBeFalsy();
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
		expect(nodeSnapShot.quorumSetChanged(newlyDetectedNodeDTO)).toBeTruthy();
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
		expect(nodeSnapShot.hasNodeChanged(nodeDTO)).toBeFalsy();
	});
	test('ip changed', () => {
		nodeDTO.ip = 'localhost3';
		expect(nodeSnapShot.hasNodeChanged(nodeDTO)).toBeTruthy();
	});
	test('qset changed', () => {
		nodeDTO.quorumSet.validators.push('a');
		expect(nodeSnapShot.hasNodeChanged(nodeDTO)).toBeTruthy();
	});
	test('geo changed', () => {
		nodeDTO.geoData.longitude = 123;
		expect(nodeSnapShot.hasNodeChanged(nodeDTO)).toBeTruthy();
	});
	test('details', () => {
		nodeDTO.versionStr = 'newVersion';
		expect(nodeSnapShot.hasNodeChanged(nodeDTO)).toBeTruthy();
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

		expect(nodeSnapShot.geoDataChanged(createGeoData(nodeDTO))).toBeFalsy();
		nodeDTO.geoData.longitude = 1;
		expect(nodeSnapShot.geoDataChanged(createGeoData(nodeDTO))).toBeTruthy();
		nodeDTO.geoData.latitude = 2;
		expect(nodeSnapShot.geoDataChanged(createGeoData(nodeDTO))).toBeTruthy();
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
		expect(nodeSnapShot.organizationChanged(nodeDTO)).toBeTruthy();
		expect(nodeSnapShot.hasNodeChanged(nodeDTO)).toBeTruthy();
	});

	test('no change', () => {
		nodeSnapShot.organization = organization;
		//expect(nodeSnapShot.organizationChanged(nodeDTO)).toBeFalsy();
		expect(nodeSnapShot.hasNodeChanged(nodeDTO)).toBeFalsy();
	});
});

describe('toNode', () => {
	let nodeDTO: NodeDTO;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();
	let versionedOrganization: Organization;
	let nodeMeasurement: NodeMeasurement;
	let nodeMeasurement24HourAverage: NodeMeasurementAverage;
	let nodeMeasurement30DayAverage: NodeMeasurementAverage;

	beforeEach(() => {
		const organizationId = createDummyOrganizationId();
		const node = new Node(createDummyPublicKey(), time);
		nodeDTO = new NodeDTO(node.publicKey.value, 'localhost', 1);
		nodeDTO.dateDiscovered = time;
		nodeDTO.dateUpdated = time;
		nodeDTO.port = 100;
		nodeDTO.active = true;
		nodeDTO.isValidating = true;
		nodeDTO.isFullValidator = true;
		nodeDTO.isp = 'aws';
		nodeDTO.name = 'myNode';
		nodeDTO.ledgerVersion = 2;
		nodeDTO.overlayMinVersion = 2;
		nodeDTO.overlayVersion = 3;
		nodeDTO.overLoaded = true;
		nodeDTO.versionStr = 'v10';
		nodeDTO.quorumSetHashKey = 'key';
		nodeDTO.quorumSet.validators.push('b');
		nodeDTO.quorumSet.threshold = 1;
		nodeDTO.geoData.longitude = 10;
		nodeDTO.geoData.latitude = 5;
		nodeDTO.geoData.countryName = 'USA';
		nodeDTO.geoData.countryCode = 'US';
		nodeDTO.host = 'myHost';
		nodeDTO.historyUrl = 'myUrl';
		nodeDTO.homeDomain = 'domain.com';
		nodeDTO.index = 1;
		nodeDTO.statistics.has24HourStats = true;
		nodeDTO.statistics.has30DayStats = true;
		nodeDTO.statistics.active24HoursPercentage = 0.1;
		nodeDTO.statistics.active30DaysPercentage = 0.2;
		nodeDTO.statistics.validating24HoursPercentage = 0.3;
		nodeDTO.statistics.validating30DaysPercentage = 0.4;
		nodeDTO.statistics.overLoaded24HoursPercentage = 0.5;
		nodeDTO.statistics.overLoaded30DaysPercentage = 0.6;
		nodeDTO.organizationId = organizationId.value;
		nodeDTO.activeInScp = true;

		nodeMeasurement = NodeMeasurement.fromNodeDTO(time, node, nodeDTO);
		nodeMeasurement24HourAverage = {
			activeAvg: 0.1,
			fullValidatorAvg: 0.7,
			indexAvg: 0.9,
			nodeId: 1,
			overLoadedAvg: 0.5,
			validatingAvg: 0.3,
			historyArchiveErrorAvg: 0.1
		};
		nodeMeasurement30DayAverage = {
			activeAvg: 0.2,
			fullValidatorAvg: 0.8,
			indexAvg: 1,
			nodeId: 1,
			overLoadedAvg: 0.6,
			validatingAvg: 0.4,
			historyArchiveErrorAvg: 0.1
		};
		versionedOrganization = new Organization(organizationId, time);

		const snapShotFactory = new NodeSnapShotFactory();
		nodeSnapShot = snapShotFactory.create(
			node,
			nodeDTO,
			time,
			versionedOrganization
		);
	});

	test('toNode', () => {
		const parsedNode = nodeSnapShot.toNodeDTO(
			time,
			nodeMeasurement,
			nodeMeasurement24HourAverage,
			nodeMeasurement30DayAverage
		);
		expect(parsedNode).toEqual(nodeDTO);
		expect(parsedNode.overLoaded).toBeTruthy();
		expect(parsedNode.activeInScp).toBeTruthy();
		expect(parsedNode.statistics.has30DayStats).toBeTruthy();
	});

	test('toJson', () => {
		const nodeStorage = new Node(createDummyPublicKey());
		nodeSnapShot = new NodeSnapShot(nodeStorage, time, 'localhost', 8000);
		nodeSnapShot.geoData = NodeGeoDataLocation.create({
			countryCode: 'US',
			countryName: 'USA',
			latitude: 10,
			longitude: 5
		});
		nodeSnapShot.quorumSet = new NodeQuorumSet('hash', new QuorumSet(1, ['a']));
		nodeSnapShot.nodeDetails = NodeDetails.create({
			homeDomain: 'domain.com',
			historyUrl: 'myUrl',
			host: 'myHost',
			isp: 'aws',
			name: 'myNode',
			overlayMinVersion: 2,
			overlayVersion: 3,
			versionStr: 'v10',
			alias: 'alias',
			ledgerVersion: 2
		});
		nodeSnapShot.organization = new Organization(
			createDummyOrganizationId(),
			new Date()
		);
		expect(JSON.stringify(nodeSnapShot));
	});
});

function createGeoData(nodeDTO: NodeDTO): NodeGeoDataLocation | null {
	if (nodeDTO.geoData.longitude === null && nodeDTO.geoData.latitude === null) {
		return null;
	}
	return NodeGeoDataLocation.create({
		countryCode: nodeDTO.geoData.countryCode,
		countryName: nodeDTO.geoData.countryName,
		latitude: nodeDTO.geoData.latitude,
		longitude: nodeDTO.geoData.longitude
	});
}
