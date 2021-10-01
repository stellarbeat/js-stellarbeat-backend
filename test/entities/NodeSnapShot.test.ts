import { Node, Organization, QuorumSet } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../../src/entities/NodeSnapShot';
import NodePublicKeyStorage from '../../src/entities/NodePublicKeyStorage';
import NodeQuorumSetStorage from '../../src/entities/NodeQuorumSetStorage';
import NodeDetailsStorage from '../../src/entities/NodeDetailsStorage';
import NodeGeoDataStorage from '../../src/entities/NodeGeoDataStorage';
import OrganizationIdStorage from '../../src/entities/OrganizationIdStorage';
import NodeSnapShotFactory from '../../src/factory/NodeSnapShotFactory';
import NodeMeasurementV2 from '../../src/entities/NodeMeasurementV2';
import { NodeMeasurementV2Average } from '../../src/repositories/NodeMeasurementV2Repository';

describe('nodeIpPortChanged', () => {
	const time = new Date();
	test('no', () => {
		const node = new Node('pk', 'localhost', 11625);
		const snapShot = new NodeSnapShot(
			new NodePublicKeyStorage('pk'),
			time,
			'localhost',
			11625
		);
		expect(snapShot.nodeIpPortChanged(node)).toBeFalsy();
	});
	test('ip changed', () => {
		const node = new Node('pk', 'localhost2', 11625);
		const snapShot = new NodeSnapShot(
			new NodePublicKeyStorage('pk'),
			time,
			'localhost',
			11625
		);
		expect(snapShot.nodeIpPortChanged(node)).toBeTruthy();
	});
	test('port changed', () => {
		const node = new Node('pk', 'localhost', 11624);
		const snapShot = new NodeSnapShot(
			new NodePublicKeyStorage('pk'),
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
		const nodeStorage = new NodePublicKeyStorage('a');
		nodeSnapShot = new NodeSnapShot(nodeStorage, time, 'localhost', 8000);
		nodeSnapShot.quorumSet = null;
		node = new Node('A');
	});

	test('first change', () => {
		expect(nodeSnapShot.quorumSetChanged(node)).toBeFalsy();
		node.quorumSet.validators.push('a');
		expect(nodeSnapShot.quorumSetChanged(node)).toBeTruthy();
	});

	test('no change', () => {
		nodeSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);
		expect(nodeSnapShot.quorumSetChanged(node)).toBeFalsy();
	});

	test('change', () => {
		const newlyDetectedNode = new Node('pk');
		node.quorumSet.validators.push('a');
		node.quorumSet.hashKey = 'old';
		nodeSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);
		newlyDetectedNode.quorumSet.hashKey = 'new';
		expect(nodeSnapShot.quorumSetChanged(newlyDetectedNode)).toBeTruthy();
	});
});

describe('nodeDetails changed', () => {
	let node: Node;
	let nodeDetailsStorage: NodeDetailsStorage;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		node = new Node('A');
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
		nodeDetailsStorage = new NodeDetailsStorage();
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
		const nodeStorage = new NodePublicKeyStorage('a');
		nodeSnapShot = new NodeSnapShot(nodeStorage, time, 'localhost', 8000);
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
		node = new Node('a');
		const nodeStorage = new NodePublicKeyStorage('a');
		nodeSnapShot = new NodeSnapShot(nodeStorage, time, node.ip, node.port);
		nodeSnapShot.nodeDetails = null;
		nodeSnapShot.geoData = null;
		nodeSnapShot.quorumSet = null;
		nodeSnapShot.organizationIdStorage = null;
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
	let geoDataStorage: NodeGeoDataStorage;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();

	beforeEach(() => {
		node = new Node('a');
		node.geoData.longitude = 2;
		node.geoData.latitude = 1;
		node.geoData.countryCode = 'US';
		node.geoData.countryName = 'United States';
		geoDataStorage = new NodeGeoDataStorage();
		geoDataStorage.countryCode = 'US';
		geoDataStorage.countryName = 'United States';
		geoDataStorage.latitude = 1;
		geoDataStorage.longitude = 2;
		const nodeStorage = new NodePublicKeyStorage('a');
		nodeSnapShot = new NodeSnapShot(nodeStorage, time, 'localhost', 8000);
		nodeSnapShot.geoData = geoDataStorage;
		nodeSnapShot.quorumSet = null;
	});

	test('first change', () => {
		nodeSnapShot.geoData = null;
		node.geoData.longitude = undefined;
		node.geoData.latitude = undefined;

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
		expect(NodeGeoDataStorage.fromGeoData(node.geoData)).toEqual(
			geoDataStorage
		);
	});
});

describe('organization changed', () => {
	let node: Node;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();
	let organization: Organization;
	let organizationIdStorage: OrganizationIdStorage;

	beforeEach(() => {
		const nodeStorage = new NodePublicKeyStorage('a');
		node = new Node('a');
		nodeSnapShot = new NodeSnapShot(nodeStorage, time, node.ip, node.port);
		nodeSnapShot.organizationIdStorage = null;
		nodeSnapShot.nodeDetails = null;
		organization = new Organization('orgId', 'orgName');
		node.organizationId = organization.id;
		organizationIdStorage = new OrganizationIdStorage('orgId', time);
		nodeSnapShot.organizationIdStorage = null;
		nodeSnapShot.quorumSet = null;
	});

	test('first change', () => {
		expect(nodeSnapShot.organizationChanged(node)).toBeTruthy();
		expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
	});

	test('no change', () => {
		nodeSnapShot.organizationIdStorage = organizationIdStorage;
		expect(nodeSnapShot.organizationChanged(node)).toBeFalsy();
		expect(nodeSnapShot.hasNodeChanged(node)).toBeFalsy();
	});
});

describe('toNode', () => {
	let node: Node;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();
	let organizationIdStorage: OrganizationIdStorage;
	let nodeMeasurement: NodeMeasurementV2;
	let nodeMeasurement24HourAverage: NodeMeasurementV2Average;
	let nodeMeasurement30DayAverage: NodeMeasurementV2Average;

	beforeEach(() => {
		node = new Node('a', 'localhost', 1);
		node.dateDiscovered = time;
		node.dateUpdated = time;
		node.publicKey = 'a';
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
		node.quorumSet.hashKey = 'key';
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

		const nodePublicKeyStorage = new NodePublicKeyStorage(
			node.publicKey!,
			time
		);
		nodeMeasurement = NodeMeasurementV2.fromNode(
			time,
			nodePublicKeyStorage,
			node
		);
		nodeMeasurement24HourAverage = {
			activeAvg: 0.1,
			fullValidatorAvg: 0.7,
			indexAvg: 0.9,
			nodeStoragePublicKeyId: 1,
			overLoadedAvg: 0.5,
			validatingAvg: 0.3
		};
		nodeMeasurement30DayAverage = {
			activeAvg: 0.2,
			fullValidatorAvg: 0.8,
			indexAvg: 1,
			nodeStoragePublicKeyId: 1,
			overLoadedAvg: 0.6,
			validatingAvg: 0.4
		};
		organizationIdStorage = new OrganizationIdStorage('orgId', time);

		const snapShotFactory = new NodeSnapShotFactory();
		nodeSnapShot = snapShotFactory.create(
			nodePublicKeyStorage,
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
		const nodeStorage = new NodePublicKeyStorage('a');
		nodeSnapShot = new NodeSnapShot(nodeStorage, time, 'localhost', 8000);
		nodeSnapShot.geoData = new NodeGeoDataStorage();
		nodeSnapShot.quorumSet = new NodeQuorumSetStorage(
			'hash',
			new QuorumSet('hash', 1, ['a'])
		);
		nodeSnapShot.nodeDetails = new NodeDetailsStorage();
		nodeSnapShot.organizationIdStorage = new OrganizationIdStorage(
			'id',
			new Date()
		);
		expect(JSON.stringify(nodeSnapShot));
	});
});
