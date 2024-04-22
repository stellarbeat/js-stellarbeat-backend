import Node from '../../domain/node/Node';
import { createDummyPublicKey } from '../../domain/node/__fixtures__/createDummyPublicKey';
import NodeGeoDataLocation from '../../domain/node/NodeGeoDataLocation';
import NodeQuorumSet from '../../domain/node/NodeQuorumSet';
import { NodeV1, QuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import NodeDetails from '../../domain/node/NodeDetails';
import { createDummyOrganizationId } from '../../domain/organization/__fixtures__/createDummyOrganizationId';
import NodeMeasurement from '../../domain/node/NodeMeasurement';
import { NodeMeasurementAverage } from '../../domain/node/NodeMeasurementAverage';
import { OrganizationId } from '../../domain/organization/OrganizationId';
import { NodeV1DTOMapper } from '../NodeV1DTOMapper';

describe('NodeV1DTOMapper', () => {
	let nodeV1DTO: NodeV1;
	let node: Node;
	const time = new Date();
	let nodeMeasurement: NodeMeasurement;
	let nodeMeasurement24HourAverage: NodeMeasurementAverage;
	let nodeMeasurement30DayAverage: NodeMeasurementAverage;

	let organizationId: OrganizationId;

	beforeEach(() => {
		organizationId = createDummyOrganizationId();
		const publicKey = createDummyPublicKey();
		nodeV1DTO = {
			publicKey: publicKey.value,
			host: 'myHost',
			ip: 'localhost',
			port: 100,
			dateDiscovered: time.toISOString(),
			dateUpdated: time.toISOString(),
			active: true,
			isValidating: true,
			isFullValidator: true,
			isp: 'aws',
			name: 'myNode',
			ledgerVersion: 2,
			overlayMinVersion: 2,
			overlayVersion: 3,
			overLoaded: true,
			versionStr: 'v10',
			quorumSetHashKey: 'key',
			lag: 100,
			quorumSet: {
				validators: ['b'],
				threshold: 1,
				innerQuorumSets: []
			},
			geoData: {
				longitude: 10,
				latitude: 5,
				countryCode: 'US',
				countryName: 'USA'
			},
			homeDomain: 'domain.com',
			alias: 'myAlias',
			organizationId: organizationId.value,
			index: 1,
			isValidator: true,
			historyArchiveHasError: true,
			historyUrl: 'myUrl',
			activeInScp: true,
			connectivityError: true,
			stellarCoreVersionBehind: true,
			statistics: {
				has24HourStats: true,
				has30DayStats: true,
				active24HoursPercentage: 0.1,
				active30DaysPercentage: 0.2,
				validating24HoursPercentage: 0.3,
				validating30DaysPercentage: 0.4,
				overLoaded24HoursPercentage: 0.5,
				overLoaded30DaysPercentage: 0.6
			}
		};

		node = Node.create(time, publicKey, {
			ip: nodeV1DTO.ip,
			port: nodeV1DTO.port
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
		if (nodeV1DTO.quorumSetHashKey && nodeV1DTO.quorumSet) {
			node.updateQuorumSet(
				NodeQuorumSet.create(
					nodeV1DTO.quorumSetHashKey,
					new QuorumSet(
						nodeV1DTO.quorumSet.threshold,
						nodeV1DTO.quorumSet.validators,
						[]
					)
				),
				time
			);
		}

		nodeMeasurement = new NodeMeasurement(time, node);
		nodeMeasurement.isActive = true;
		nodeMeasurement.isValidating = true;
		nodeMeasurement.isActiveInScp = true;
		nodeMeasurement.historyArchiveHasError = true;
		nodeMeasurement.isOverLoaded = true;
		nodeMeasurement.isFullValidator = true;
		nodeMeasurement.historyArchiveHasError = true;
		nodeMeasurement.index = 100;
		nodeMeasurement.connectivityError = true;
		nodeMeasurement.stellarCoreVersionBehind = true;
		nodeMeasurement.lag = 100;
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

	test('toNodeV1DTO', () => {
		const parsedNode = new NodeV1DTOMapper().toNodeV1DTO(
			time,
			node,
			nodeMeasurement24HourAverage,
			nodeMeasurement30DayAverage,
			organizationId.value
		);
		expect(parsedNode).toEqual(nodeV1DTO);
	});

	test('toNodeSnapshotV1DTO', () => {
		nodeV1DTO.organizationId = null;
		nodeV1DTO.statistics = {
			has24HourStats: false,
			has30DayStats: false,
			active24HoursPercentage: 0,
			active30DaysPercentage: 0,
			validating24HoursPercentage: 0,
			validating30DaysPercentage: 0,
			overLoaded24HoursPercentage: 0,
			overLoaded30DaysPercentage: 0
		};
		expect(new NodeV1DTOMapper().toNodeSnapshotV1DTO(node)).toEqual({
			startDate: node.snapshotStartDate.toISOString(),
			endDate: node.snapshotEndDate.toISOString(),
			node: nodeV1DTO
		});
	});
});
