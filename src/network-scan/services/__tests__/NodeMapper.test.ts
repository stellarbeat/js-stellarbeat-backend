import Node from '../../domain/node/Node';
import { createDummyPublicKey } from '../../domain/node/__fixtures__/createDummyPublicKey';
import NodeSnapShot from '../../domain/node/NodeSnapShot';
import NodeGeoDataLocation from '../../domain/node/NodeGeoDataLocation';
import NodeQuorumSet from '../../domain/node/NodeQuorumSet';
import { QuorumSet } from '@stellarbeat/js-stellar-domain';
import NodeDetails from '../../domain/node/NodeDetails';
import Organization from '../../domain/organization/Organization';
import { createDummyOrganizationId } from '../../domain/organization/__fixtures__/createDummyOrganizationId';
import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain/lib/node';
import NodeMeasurement from '../../domain/node/NodeMeasurement';
import { NodeMeasurementAverage } from '../../domain/node/NodeMeasurementAverage';
import NodeSnapShotFactory from '../../domain/node/snapshotting/NodeSnapShotFactory';
import { NodeMapper } from '../NodeMapper';

describe('NodeMapper', () => {
	let nodeDTO: NodeDTO;
	let nodeSnapShot: NodeSnapShot;
	const time = new Date();
	let versionedOrganization: Organization;
	let nodeMeasurement: NodeMeasurement;
	let nodeMeasurement24HourAverage: NodeMeasurementAverage;
	let nodeMeasurement30DayAverage: NodeMeasurementAverage;

	beforeEach(() => {
		const organizationId = createDummyOrganizationId();
		const publicKey = createDummyPublicKey();
		nodeDTO = new NodeDTO(publicKey.value, 'localhost', 1);
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

		versionedOrganization = new Organization(organizationId, time);
		const snapShotFactory = new NodeSnapShotFactory();
		nodeSnapShot = snapShotFactory.create(
			publicKey,
			nodeDTO,
			time,
			versionedOrganization
		);

		nodeMeasurement = NodeMeasurement.fromNodeDTO(
			time,
			nodeSnapShot.node,
			nodeDTO
		);
		nodeMeasurement24HourAverage = {
			activeAvg: 0.1,
			fullValidatorAvg: 0.7,
			indexAvg: 0.9,
			publicKey: publicKey.value,
			overLoadedAvg: 0.5,
			validatingAvg: 0.3,
			historyArchiveErrorAvg: 0.1
		};
		nodeMeasurement30DayAverage = {
			activeAvg: 0.2,
			fullValidatorAvg: 0.8,
			indexAvg: 1,
			publicKey: publicKey.value,
			overLoadedAvg: 0.6,
			validatingAvg: 0.4,
			historyArchiveErrorAvg: 0.1
		};
	});
	test('toNode', () => {
		const parsedNode = NodeMapper.toNodeDTO(
			time,
			nodeSnapShot,
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
		const node = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 8000
		});
		nodeSnapShot = node.currentSnapshot();
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
		expect(NodeMapper.toNodeSnapshotDTO(nodeSnapShot));
	});
});
