import Node from '../../domain/node/Node';
import { createDummyPublicKey } from '../../domain/node/__fixtures__/createDummyPublicKey';
import NodeGeoDataLocation from '../../domain/node/NodeGeoDataLocation';
import NodeQuorumSet from '../../domain/node/NodeQuorumSet';
import { QuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import NodeDetails from '../../domain/node/NodeDetails';
import { createDummyOrganizationId } from '../../domain/organization/__fixtures__/createDummyOrganizationId';
import { Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared/lib/node';
import NodeMeasurement from '../../domain/node/NodeMeasurement';
import { NodeMeasurementAverage } from '../../domain/node/NodeMeasurementAverage';
import { NodeMapper } from '../NodeMapper';
import { OrganizationId } from '../../domain/organization/OrganizationId';

describe('NodeMapper', () => {
	let nodeDTO: NodeDTO;
	let node: Node;
	const time = new Date();
	let nodeMeasurement: NodeMeasurement;
	let nodeMeasurement24HourAverage: NodeMeasurementAverage;
	let nodeMeasurement30DayAverage: NodeMeasurementAverage;

	let organizationId: OrganizationId;

	beforeEach(() => {
		organizationId = createDummyOrganizationId();
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
		nodeDTO.historyArchiveHasError = true;
		nodeDTO.alias = 'myAlias';
		nodeDTO.isp = 'aws';

		node = Node.create(time, publicKey, {
			ip: nodeDTO.ip,
			port: nodeDTO.port
		});
		node.updateGeoData(
			NodeGeoDataLocation.create({
				longitude: 10,
				latitude: 5,
				countryName: 'USA',
				countryCode: 'US'
			}),
			node.snapshotStartDate
		);
		node.updateDetails(
			NodeDetails.create({
				name: 'myNode',
				host: 'myHost',
				alias: 'myAlias',
				historyUrl: 'myUrl'
			}),
			time
		);
		node.updateIsp('aws', time);
		node.updateHomeDomain('domain.com', time);
		node.updateLedgerVersion(2, time);
		node.updateOverlayVersion(3, time);
		node.updateOverlayMinVersion(2, time);
		node.updateVersionStr('v10', time);
		node.updateQuorumSet(
			NodeQuorumSet.create(nodeDTO.quorumSetHashKey, nodeDTO.quorumSet),
			time
		);

		nodeMeasurement = new NodeMeasurement(time, node);
		nodeMeasurement.isActive = true;
		nodeMeasurement.isValidating = true;
		nodeMeasurement.isActiveInScp = true;
		nodeMeasurement.historyArchiveHasError = true;
		nodeMeasurement.isOverLoaded = true;
		nodeMeasurement.isFullValidator = true;
		nodeMeasurement.historyArchiveHasError = true;
		nodeMeasurement.index = 100;
		node.addMeasurement(nodeMeasurement);

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
		const parsedNode = new NodeMapper().toNodeDTO(
			time,
			node,
			nodeMeasurement24HourAverage,
			nodeMeasurement30DayAverage,
			organizationId.value
		);
		expect(parsedNode).toEqual(nodeDTO);
		expect(parsedNode.overLoaded).toBeTruthy();
		expect(parsedNode.activeInScp).toBeTruthy();
		expect(parsedNode.statistics.has30DayStats).toBeTruthy();
	});

	test('toJson', () => {
		const geoData = NodeGeoDataLocation.create({
			countryCode: 'US',
			countryName: 'USA',
			latitude: 10,
			longitude: 5
		});
		const quorumSet = NodeQuorumSet.create('hash', new QuorumSet(1, ['a']));
		const details = NodeDetails.create({
			historyUrl: 'myUrl',
			host: 'myHost',
			name: 'myNode',
			alias: 'alias'
		});
		const node = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 8000
		});
		node.updateGeoData(geoData, node.snapshotStartDate);
		node.updateDetails(details, node.snapshotStartDate);
		node.updateQuorumSet(quorumSet, node.snapshotStartDate);

		expect(new NodeMapper().toNodeSnapshotDTO(node));
	});
});
