import { Node, Organization, QuorumSet } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../NodeSnapShot';
import NodeQuorumSet from '../NodeQuorumSet';
import NodeDetails from '../NodeDetails';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import VersionedOrganization from '../VersionedOrganization';
import NodeSnapShotFactory from '../snapshotting/factory/NodeSnapShotFactory';
import NodeMeasurement from '../measurement/NodeMeasurement';
import { NodeMeasurementAverage } from '../measurement/NodeMeasurementAverage';
import { createDummyPublicKey } from '../__fixtures__/createDummyPublicKey';
import VersionedNode from '../VersionedNode';

describe('nodeIpPortChanged', () => {
	const time = new Date();
	const versionedNode = new VersionedNode(createDummyPublicKey());
	test('no', () => {
		const node = new Node(versionedNode.publicKey.value, 'localhost', 11625);
		const snapShot = new NodeSnapShot(
			versionedNode,
			time,
			time,
			'localhost',
			11625
		);
		expect(snapShot.nodeIpPortChanged(node)).toBeFalsy();
	});
	test('ip changed', () => {
		const node = new Node(versionedNode.publicKey.value, 'localhost2', 11625);
		const snapShot = new NodeSnapShot(
			versionedNode,
			time,
			time,
			'localhost',
			11625
		);
		expect(snapShot.nodeIpPortChanged(node)).toBeTruthy();
	});
	test('port changed', () => {
		const node = new Node(versionedNode.publicKey.value, 'localhost', 11624);
		const snapShot = new NodeSnapShot(
			versionedNode,
			time,
			time,
			'localhost',
			11625
		);
		expect(snapShot.nodeIpPortChanged(node)).toBeTruthy();
	});
});
describe('quorumSet changed', () => {
	let node: Node;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		const versionedNode = new VersionedNode(createDummyPublicKey());
		nodeSnapShot = new NodeSnapShot(
			versionedNode,
			time,
			time,
			'localhost',
			8000
		);
		nodeSnapShot.quorumSet = null;
		node = new Node(versionedNode.publicKey.value);
	});

	test('first change', () => {
		expect(nodeSnapShot.quorumSetChanged(node)).toBeFalsy();
		node.quorumSetHashKey = 'key';
		node.quorumSet.validators.push('a');
		expect(nodeSnapShot.quorumSetChanged(node)).toBeTruthy();
	});

	test('no change', () => {
		nodeSnapShot.quorumSet = NodeQuorumSet.fromQuorumSet('key', node.quorumSet);
		expect(nodeSnapShot.quorumSetChanged(node)).toBeFalsy();
	});

	test('change', () => {
		const newlyDetectedNode = new Node('pk');
		node.quorumSet.validators.push('a');
		node.quorumSetHashKey = 'old';
		nodeSnapShot.quorumSet = NodeQuorumSet.fromQuorumSet(
			node.quorumSetHashKey,
			node.quorumSet
		);
		newlyDetectedNode.quorumSetHashKey = 'new';
		expect(nodeSnapShot.quorumSetChanged(newlyDetectedNode)).toBeTruthy();
	});
});

describe('nodeDetails changed', () => {
	let node: Node;
	let nodeDetailsStorage: NodeDetails;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		const versionedNode = new VersionedNode(createDummyPublicKey());
		node = new Node(versionedNode.publicKey.value);
		node.alias = 'alias';
		node.historyUrl = 'url';
		node.homeDomain = 'home';
		node.host = 'host';
		node.isp = 'isp';
		node.ledgerVersion = 1;
		node.name = 'name';
		node.overlayMinVersion = 3;
		node.versionStr = 'v1';
		node.overlayVersion = 5;
		nodeDetailsStorage = new NodeDetails();
		nodeDetailsStorage.ledgerVersion = 1;
		nodeDetailsStorage.overlayMinVersion = 3;
		nodeDetailsStorage.overlayVersion = 5;
		nodeDetailsStorage.versionStr = 'v1';
		nodeDetailsStorage.alias = 'alias';
		nodeDetailsStorage.historyUrl = 'url';
		nodeDetailsStorage.homeDomain = 'home';
		nodeDetailsStorage.host = 'host';
		nodeDetailsStorage.isp = 'isp';
		nodeDetailsStorage.name = 'name';
		nodeSnapShot = new NodeSnapShot(
			versionedNode,
			time,
			time,
			'localhost',
			8000
		);
		nodeSnapShot.nodeDetails = nodeDetailsStorage;
	});

	test('first change', () => {
		nodeSnapShot.nodeDetails = null;
		node = new Node('pk');

		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeFalsy();
		node.versionStr = '1.0';
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});

	test('alias', () => {
		nodeDetailsStorage.alias = 'alias2';
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('history', () => {
		nodeDetailsStorage.historyUrl = 'new';
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('homeDomain', () => {
		nodeDetailsStorage.homeDomain = 'new';
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('host', () => {
		nodeDetailsStorage.host = 'new';
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('isp', () => {
		nodeDetailsStorage.isp = 'new';
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('ledgerVersion', () => {
		nodeDetailsStorage.ledgerVersion = 7;
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('name', () => {
		nodeDetailsStorage.name = 'new';
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('overlay', () => {
		nodeDetailsStorage.overlayVersion = 7;
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('overlaymin', () => {
		nodeDetailsStorage.overlayMinVersion = 7;
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('version', () => {
		nodeDetailsStorage.versionStr = 'new';
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('no storage', () => {
		nodeSnapShot.nodeDetails = null;
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
	});
	test('not changed', () => {
		expect(nodeSnapShot.nodeDetailsChanged(node)).toBeFalsy();
	});
});

describe('hasNodeChanged', () => {
	let node: Node;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		const versionedNode = new VersionedNode(createDummyPublicKey());
		node = new Node(versionedNode.publicKey.value);
		nodeSnapShot = new NodeSnapShot(
			versionedNode,
			time,
			time,
			node.ip,
			node.port
		);
		nodeSnapShot.nodeDetails = null;
		nodeSnapShot.geoData = null;
		nodeSnapShot.quorumSet = null;
		nodeSnapShot.organization = null;
	});
	test('no', () => {
		expect(nodeSnapShot.hasNodeChanged(node)).toBeFalsy();
	});
	test('ip changed', () => {
		node.ip = 'localhost3';
		expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
	});
	test('qset changed', () => {
		node.quorumSet.validators.push('a');
		expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
	});
	test('geo changed', () => {
		node.geoData.longitude = 123;
		expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
	});
	test('details', () => {
		node.versionStr = 'newVersion';
		expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
	});
});

describe('geoData changed', () => {
	let node: Node;
	let geoDataStorage: NodeGeoDataLocation;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		const versionedNode = new VersionedNode(createDummyPublicKey());

		node = new Node(versionedNode.publicKey.value);
		node.geoData.longitude = 2;
		node.geoData.latitude = 1;
		node.geoData.countryCode = 'US';
		node.geoData.countryName = 'United States';
		geoDataStorage = new NodeGeoDataLocation();
		geoDataStorage.countryCode = 'US';
		geoDataStorage.countryName = 'United States';
		geoDataStorage.latitude = 1;
		geoDataStorage.longitude = 2;
		nodeSnapShot = new NodeSnapShot(
			versionedNode,
			time,
			time,
			'localhost',
			8000
		);
		nodeSnapShot.geoData = geoDataStorage;
		nodeSnapShot.quorumSet = null;
	});

	test('first change', () => {
		nodeSnapShot.geoData = null;
		node.geoData.longitude = null;
		node.geoData.latitude = null;

		expect(nodeSnapShot.geoDataChanged(node)).toBeFalsy();
		node.geoData.longitude = 1;
		expect(nodeSnapShot.geoDataChanged(node)).toBeTruthy();
		node.geoData.latitude = 2;
		expect(nodeSnapShot.geoDataChanged(node)).toBeTruthy();
	});

	test('latitude', () => {
		geoDataStorage.latitude = 4;
		expect(nodeSnapShot.geoDataChanged(node)).toBeTruthy();
	});

	test('longitude', () => {
		geoDataStorage.longitude = 4;
		expect(nodeSnapShot.geoDataChanged(node)).toBeTruthy();
	});

	test('not changed', () => {
		expect(nodeSnapShot.geoDataChanged(node)).toBeFalsy();
	});

	test('longitude zero', () => {
		geoDataStorage.longitude = 0;
		node.geoData.longitude = 0;
		expect(nodeSnapShot.geoDataChanged(node)).toBeFalsy();
		expect(NodeGeoDataLocation.fromGeoData(node.geoData)).toEqual(
			geoDataStorage
		);
	});
});

describe('organization changed', () => {
	let node: Node;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();
	let organization: Organization;
	let versionedOrganization: VersionedOrganization;

	beforeEach(() => {
		const versionedNode = new VersionedNode(createDummyPublicKey());
		node = new Node(versionedNode.publicKey.value);
		nodeSnapShot = new NodeSnapShot(
			versionedNode,
			time,
			time,
			node.ip,
			node.port
		);
		nodeSnapShot.organization = null;
		nodeSnapShot.nodeDetails = null;
		organization = new Organization('orgId', 'orgName');
		node.organizationId = organization.id;
		versionedOrganization = new VersionedOrganization('orgId', time);
		nodeSnapShot.organization = null;
		nodeSnapShot.quorumSet = null;
	});

	test('first change', () => {
		expect(nodeSnapShot.organizationChanged(node)).toBeTruthy();
		expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
	});

	test('no change', () => {
		nodeSnapShot.organization = versionedOrganization;
		expect(nodeSnapShot.organizationChanged(node)).toBeFalsy();
		expect(nodeSnapShot.hasNodeChanged(node)).toBeFalsy();
	});
});

describe('toNode', () => {
	let node: Node;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();
	let organizationIdStorage: VersionedOrganization;
	let nodeMeasurement: NodeMeasurement;
	let nodeMeasurement24HourAverage: NodeMeasurementAverage;
	let nodeMeasurement30DayAverage: NodeMeasurementAverage;

	beforeEach(() => {
		const versionedNode = new VersionedNode(createDummyPublicKey());
		node = new Node(versionedNode.publicKey.value, 'localhost', 1);
		node.dateDiscovered = time;
		node.dateUpdated = time;
		node.port = 100;
		node.active = true;
		node.isValidating = true;
		node.isFullValidator = true;
		node.isp = 'aws';
		node.name = 'myNode';
		node.ledgerVersion = 2;
		node.overlayMinVersion = 2;
		node.overlayVersion = 3;
		node.overLoaded = true;
		node.versionStr = 'v10';
		node.quorumSetHashKey = 'key';
		node.quorumSet.validators.push('b');
		node.quorumSet.threshold = 1;
		node.geoData.longitude = 10;
		node.geoData.latitude = 5;
		node.geoData.countryName = 'USA';
		node.geoData.countryCode = 'US';
		node.host = 'myHost';
		node.historyUrl = 'myUrl';
		node.homeDomain = 'domain.com';
		node.index = 1;
		node.statistics.has24HourStats = true;
		node.statistics.has30DayStats = true;
		node.statistics.active24HoursPercentage = 0.1;
		node.statistics.active30DaysPercentage = 0.2;
		node.statistics.validating24HoursPercentage = 0.3;
		node.statistics.validating30DaysPercentage = 0.4;
		node.statistics.overLoaded24HoursPercentage = 0.5;
		node.statistics.overLoaded30DaysPercentage = 0.6;
		node.organizationId = 'orgId';
		node.activeInScp = true;

		nodeMeasurement = NodeMeasurement.fromNode(time, versionedNode, node);
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
		organizationIdStorage = new VersionedOrganization('orgId', time);

		const snapShotFactory = new NodeSnapShotFactory();
		nodeSnapShot = snapShotFactory.create(
			versionedNode,
			node,
			time,
			organizationIdStorage
		);
	});

	test('toNode', () => {
		const parsedNode = nodeSnapShot.toNode(
			time,
			nodeMeasurement,
			nodeMeasurement24HourAverage,
			nodeMeasurement30DayAverage
		);
		expect(parsedNode).toEqual(node);
		expect(parsedNode.overLoaded).toBeTruthy();
		expect(parsedNode.activeInScp).toBeTruthy();
	});

	test('toJson', () => {
		const nodeStorage = new VersionedNode(createDummyPublicKey());
		nodeSnapShot = new NodeSnapShot(nodeStorage, time, time, 'localhost', 8000);
		nodeSnapShot.geoData = new NodeGeoDataLocation();
		nodeSnapShot.quorumSet = new NodeQuorumSet('hash', new QuorumSet(1, ['a']));
		nodeSnapShot.nodeDetails = new NodeDetails();
		nodeSnapShot.organization = new VersionedOrganization('id', new Date());
		expect(JSON.stringify(nodeSnapShot));
	});
});