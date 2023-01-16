import { Connection, Repository } from 'typeorm';

import { Network, Node, Organization } from '@stellarbeat/js-stellar-domain';
import NodeGeoDataLocation from '../../../domain/node/NodeGeoDataLocation';
import NodeQuorumSet from '../../../domain/node/NodeQuorumSet';
import { NetworkWriteRepository } from '../NetworkWriteRepository';
import TypeOrmOrganizationSnapShotRepository from '../../database/repositories/TypeOrmOrganizationSnapShotRepository';
import OrganizationMeasurement from '../../../domain/organization/OrganizationMeasurement';
import NetworkMeasurement from '../../../domain/network/NetworkMeasurement';
import { TypeOrmOrganizationMeasurementDayRepository } from '../../database/repositories/TypeOrmOrganizationMeasurementDayRepository';
import { TypeOrmNetworkMeasurementDayRepository } from '../../database/repositories/TypeOrmNetworkMeasurementDayRepository';
import NetworkScan from '../../../domain/network/scan/NetworkScan';
import NodeSnapShot from '../../../domain/node/NodeSnapShot';
import { Container } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import moment = require('moment');
import { TypeOrmNetworkMeasurementMonthRepository } from '../../database/repositories/TypeOrmNetworkMeasurementMonthRepository';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { TypeOrmNodeMeasurementRepository } from '../../database/repositories/TypeOrmNodeMeasurementRepository';
import { NETWORK_TYPES } from '../../di/di-types';
import { createDummyPublicKey } from '../../../domain/node/__fixtures__/createDummyPublicKey';
import PublicKey from '../../../domain/node/PublicKey';
import TypeOrmNodeSnapShotRepository from '../../database/repositories/TypeOrmNodeSnapShotRepository';
import { TypeOrmNodeMeasurementDayRepository } from '../../database/repositories/TypeOrmNodeMeasurementDayRepository';
import { createDummyOrganizationId } from '../../../domain/organization/__fixtures__/createDummyOrganizationId';
import { TypeOrmVersionedOrganizationRepository } from '../../database/repositories/TypeOrmVersionedOrganizationRepository';
import { NetworkReadRepository } from '../NetworkReadRepository';
import { TestUtils } from '../../../../core/utilities/TestUtils';

async function findNetworkOrThrow(
	networkReadRepository: NetworkReadRepository,
	scan: NetworkScan
): Promise<Network> {
	const retrievedNetwork = await networkReadRepository.getNetwork(scan.time);
	if (retrievedNetwork.isErr()) throw retrievedNetwork.error;
	if (retrievedNetwork.value === null) throw new Error('Network not found');

	return retrievedNetwork.value;
}

async function findNodesOrThrow(
	networkReadRepository: NetworkReadRepository,
	scan: NetworkScan
): Promise<Node[]> {
	const retrievedNetwork = await findNetworkOrThrow(
		networkReadRepository,
		scan
	);
	return retrievedNetwork.nodes;
}

async function findOrganizationsOrThrow(
	networkReadRepository: NetworkReadRepository,
	scan: NetworkScan
) {
	const retrievedNetwork = await findNetworkOrThrow(
		networkReadRepository,
		scan
	);
	return retrievedNetwork.organizations;
}

describe('multiple network updates', () => {
	jest.setTimeout(600000); //slow and long integration test
	let container: Container;
	let node: Node;
	let node2: Node;
	let geoDataRepository: Repository<NodeGeoDataLocation>;
	let quorumSetRepository: Repository<NodeQuorumSet>;
	let networkWriteRepository: NetworkWriteRepository;
	let nodeSnapShotRepository: TypeOrmNodeSnapShotRepository;
	let organizationSnapShotRepository: TypeOrmOrganizationSnapShotRepository;
	let organizationRepository: TypeOrmVersionedOrganizationRepository;
	let nodeMeasurementRepository: TypeOrmNodeMeasurementRepository;
	let nodeMeasurementDayRepository: TypeOrmNodeMeasurementDayRepository;
	let organizationMeasurementDayRepository: TypeOrmOrganizationMeasurementDayRepository;
	let organizationMeasurementRepository: Repository<OrganizationMeasurement>;
	let networkMeasurementRepository: Repository<NetworkMeasurement>;
	let networkMeasurementDayRepository: TypeOrmNetworkMeasurementDayRepository;
	let networkMeasurementMonthRepository: TypeOrmNetworkMeasurementMonthRepository;
	let networkReadRepository: NetworkReadRepository;
	let kernel: Kernel;
	let nodePublicKey: PublicKey;

	beforeAll(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
	});

	beforeEach(async () => {
		nodePublicKey = createDummyPublicKey();
		node = new Node(nodePublicKey.value, 'localhost', 1);
		node.versionStr = 'v1';
		node.active = true;
		node.isFullValidator = true;
		node.index = 0.95;
		node.isValidating = true;
		node.overLoaded = false;
		const otherNodePublicKey = createDummyPublicKey();
		node2 = new Node(otherNodePublicKey.value, 'otherHost', 1);
		node2.versionStr = 'v1';
		node2.active = true;
		node2.isFullValidator = false;
		node2.index = 0.91;
		node2.isValidating = true;
		node2.quorumSetHashKey = 'aKey';
		node2.quorumSet.threshold = 1;
		node2.quorumSet.validators.push(nodePublicKey.value);
		node2.overLoaded = true;
		node.statistics.has30DayStats = false;
		node.statistics.active24HoursPercentage = 100;
		node.statistics.validating24HoursPercentage = 100;
		node.statistics.overLoaded24HoursPercentage = 0;
		node2.statistics.has30DayStats = false;
		node2.statistics.active24HoursPercentage = 100;
		node2.statistics.validating24HoursPercentage = 100;
		node2.statistics.overLoaded24HoursPercentage = 100;
		nodeSnapShotRepository = container.get<TypeOrmNodeSnapShotRepository>(
			NETWORK_TYPES.NodeSnapshotRepository
		);
		geoDataRepository = container.get('Repository<NodeGeoDataStorage>');
		quorumSetRepository = container.get('Repository<NodeQuorumSetStorage>');
		organizationSnapShotRepository = container.get(
			NETWORK_TYPES.OrganizationSnapshotRepository
		);
		organizationRepository = container.get(
			NETWORK_TYPES.OrganizationRepository
		);
		organizationMeasurementRepository = container.get(
			'Repository<OrganizationMeasurement>'
		);
		organizationMeasurementDayRepository = container.get(
			NETWORK_TYPES.OrganizationMeasurementDayRepository
		);
		networkMeasurementDayRepository = container.get(
			NETWORK_TYPES.NetworkMeasurementDayRepository
		);
		networkMeasurementMonthRepository = container.get(
			NETWORK_TYPES.NetworkMeasurementMonthRepository
		);
		networkWriteRepository = container.get(NetworkWriteRepository);
		networkReadRepository = container.get<NetworkReadRepository>(
			NETWORK_TYPES.NetworkReadRepository
		);
		nodeMeasurementRepository = container.get(
			NETWORK_TYPES.NodeMeasurementRepository
		);
		networkMeasurementRepository = container.get(
			NETWORK_TYPES.NetworkMeasurementRepository
		);
		nodeMeasurementDayRepository = container.get(
			NETWORK_TYPES.NodeMeasurementDayRepository
		);
	});

	afterEach(async () => {
		await TestUtils.resetDB(kernel.container.get(Connection));
	});

	afterAll(async () => {
		await kernel.close();
	});

	//todo: test should be split up with mockdata in database
	test('processScanWithoutOrganizations', async () => {
		/**
		 * First update for node
		 */
		let networkScan = new NetworkScan();
		node.dateDiscovered = networkScan.time;
		node.dateUpdated = networkScan.time;
		node2.dateDiscovered = networkScan.time;
		node2.dateUpdated = networkScan.time;
		await networkWriteRepository.save(networkScan, new Network([node, node2]));

		let snapShots = await nodeSnapShotRepository.findActive();
		expect(snapShots).toHaveLength(2);
		let nodeSnapShot = snapShots.find(
			(nodeSnapShot) => nodeSnapShot.ip === node.ip
		) as NodeSnapShot;
		expect(nodeSnapShot.endDate).toEqual(NodeSnapShot.MAX_DATE);
		expect(nodeSnapShot.geoData).toEqual(null);
		expect(nodeSnapShot.ip).toEqual(node.ip);
		expect(nodeSnapShot.port).toEqual(node.port);
		expect(nodeSnapShot.nodeDetails).toBeDefined();
		expect(nodeSnapShot.nodeDetails?.versionStr).toEqual(node.versionStr);
		expect(nodeSnapShot.nodeDetails?.versionStr).toEqual(node.versionStr);
		expect(nodeSnapShot.quorumSet).toBeNull();
		expect(nodeSnapShot.node.publicKey.value).toEqual(node.publicKey);
		expect(await nodeSnapShot.startDate).toEqual(networkScan.time);

		let retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			networkScan
		);
		node.statistics.has24HourStats = true;
		node2.statistics.has24HourStats = true;
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node.publicKey
			)
		).toEqual(node);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node2.publicKey
			)
		).toEqual(node2);

		/**
		 * Second network scan with equal node
		 */
		networkScan = new NetworkScan();
		node.dateUpdated = networkScan.time;
		node2.dateUpdated = networkScan.time;
		await networkWriteRepository.save(networkScan, new Network([node, node2]));
		snapShots = await nodeSnapShotRepository.findActive();
		let allSnapShots = await nodeSnapShotRepository.find();
		expect(snapShots).toHaveLength(2);
		expect(allSnapShots).toHaveLength(2);

		retrievedNodes = await findNodesOrThrow(networkReadRepository, networkScan);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node.publicKey
			)
		).toEqual(node);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node2.publicKey
			)
		).toEqual(node2);

		/**
		 * third scan with new geo data for node
		 */
		let latestNetworkScan = new NetworkScan();

		node.dateUpdated = latestNetworkScan.time;
		node2.dateUpdated = latestNetworkScan.time;

		node.geoData.latitude = 20.815460205078125;
		node.geoData.longitude = 0;

		node.geoData.countryCode = 'US';
		node.geoData.countryName = 'United States';

		let latestNetworkScanResult = await networkWriteRepository.save(
			latestNetworkScan,
			new Network([node, node2])
		);
		expect(latestNetworkScanResult.isOk()).toBeTruthy();
		if (latestNetworkScanResult.isErr()) return;
		latestNetworkScan = latestNetworkScanResult.value;
		snapShots = await nodeSnapShotRepository.findActive();
		allSnapShots = await nodeSnapShotRepository.find();

		expect(allSnapShots).toHaveLength(3);
		expect(allSnapShots[2].endDate).toEqual(NodeSnapShot.MAX_DATE);
		expect(allSnapShots.filter((snapShot) => snapShot.isActive())).toHaveLength(
			2
		);

		expect(snapShots).toHaveLength(2);
		nodeSnapShot = snapShots.find(
			(nodeSnapShot) => nodeSnapShot.ip === node.ip
		) as NodeSnapShot;
		expect(nodeSnapShot.isActive()).toBeTruthy();
		expect(nodeSnapShot.geoData).toBeDefined();
		expect(
			nodeSnapShot.geoData?.equals(
				NodeGeoDataLocation.create({
					latitude: node.geoData.latitude,
					longitude: node.geoData.longitude,
					countryName: node.geoData.countryName,
					countryCode: node.geoData.countryCode
				})
			)
		).toBeTruthy();

		expect(nodeSnapShot.ip).toEqual(node.ip);
		expect(nodeSnapShot.port).toEqual(node.port);
		expect(nodeSnapShot.nodeDetails).toBeDefined();
		expect(nodeSnapShot.nodeDetails?.versionStr).toEqual(node.versionStr);
		expect(nodeSnapShot.quorumSet).toBeNull();
		expect(nodeSnapShot.node.publicKey.value).toEqual(node.publicKey);
		expect(nodeSnapShot.startDate).toEqual(latestNetworkScan.time);

		retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			latestNetworkScan
		);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node.publicKey
			)
		).toEqual(node);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node2.publicKey
			)
		).toEqual(node2);
		/**
		 * fourth scan with quorumset data for node 1
		 */
		latestNetworkScan = new NetworkScan();

		node.dateUpdated = latestNetworkScan.time;
		node2.dateUpdated = latestNetworkScan.time;
		node.quorumSet.threshold = 2;
		node.quorumSet.validators.push(...[node.publicKey, node2.publicKey]);
		node.quorumSetHashKey = 'IfIhR7AFvJ2YCS50O6blib1+gEaP87IwuTRgv/HEbbg=';

		latestNetworkScanResult = await networkWriteRepository.save(
			latestNetworkScan,
			new Network([node, node2], [])
		);
		expect(latestNetworkScanResult.isOk()).toBeTruthy();
		if (latestNetworkScanResult.isErr()) return;
		latestNetworkScan = latestNetworkScanResult.value;
		snapShots = await nodeSnapShotRepository.findActive();
		allSnapShots = await nodeSnapShotRepository.find();

		expect(allSnapShots).toHaveLength(4);
		expect(allSnapShots[allSnapShots.length - 1].endDate).toEqual(
			NodeSnapShot.MAX_DATE
		);
		expect(allSnapShots.filter((snapShot) => snapShot.isActive())).toHaveLength(
			2
		);

		expect(snapShots).toHaveLength(2);
		nodeSnapShot = snapShots.find(
			(nodeSnapShot) => nodeSnapShot.ip === node.ip
		) as NodeSnapShot;

		expect(nodeSnapShot.endDate).toEqual(NodeSnapShot.MAX_DATE);

		expect(nodeSnapShot.ip).toEqual(node.ip);
		expect(nodeSnapShot.port).toEqual(node.port);
		expect(nodeSnapShot.nodeDetails).toBeDefined();
		expect(nodeSnapShot.nodeDetails?.versionStr).toEqual(node.versionStr);
		expect(nodeSnapShot.quorumSet).toBeDefined();
		expect(nodeSnapShot.quorumSet?.hash).toEqual(node.quorumSetHashKey);
		expect(nodeSnapShot.quorumSet?.quorumSet).toEqual(node.quorumSet);
		expect(nodeSnapShot.node.publicKey.value).toEqual(node.publicKey);
		expect(nodeSnapShot.startDate).toEqual(latestNetworkScan.time);

		retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			latestNetworkScan
		);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node.publicKey
			)
		).toEqual(node);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node2.publicKey
			)
		).toEqual(node2);
		/**
		 * Fifth scan with new node details for node
		 */
		node.historyUrl = 'https://my-history.com';
		latestNetworkScan = new NetworkScan();
		node.dateUpdated = latestNetworkScan.time;
		node2.dateUpdated = latestNetworkScan.time;
		latestNetworkScanResult = await networkWriteRepository.save(
			latestNetworkScan,
			new Network([node, node2], [])
		);
		expect(latestNetworkScanResult.isOk()).toBeTruthy();
		if (latestNetworkScanResult.isErr()) return;
		latestNetworkScan = latestNetworkScanResult.value;
		snapShots = await nodeSnapShotRepository.findActive();
		allSnapShots = await nodeSnapShotRepository.find();

		expect(allSnapShots).toHaveLength(5);
		expect(allSnapShots[allSnapShots.length - 1].endDate).toEqual(
			NodeSnapShot.MAX_DATE
		);
		expect(allSnapShots.filter((snapShot) => snapShot.isActive())).toHaveLength(
			2
		);
		nodeSnapShot = snapShots.find(
			(nodeSnapShot) => nodeSnapShot.ip === node.ip
		) as NodeSnapShot;

		expect(snapShots).toHaveLength(2);
		expect(nodeSnapShot.endDate).toEqual(NodeSnapShot.MAX_DATE);
		expect(
			nodeSnapShot.geoData?.equals(
				NodeGeoDataLocation.create({
					longitude: node.geoData.longitude,
					latitude: node.geoData.latitude,
					countryCode: node.geoData.countryCode,
					countryName: node.geoData.countryName
				})
			)
		).toBeTruthy();
		expect(await geoDataRepository.find()).toHaveLength(1);
		expect(await quorumSetRepository.find()).toHaveLength(2);

		expect(nodeSnapShot.ip).toEqual(node.ip);
		expect(nodeSnapShot.port).toEqual(node.port);
		expect(nodeSnapShot.nodeDetails).toBeDefined();
		expect(nodeSnapShot.nodeDetails?.versionStr).toEqual(node.versionStr);
		expect(nodeSnapShot.nodeDetails?.historyUrl).toEqual(node.historyUrl);
		expect(nodeSnapShot.quorumSet).toBeDefined();
		expect(nodeSnapShot.quorumSet?.hash).toEqual(node.quorumSetHashKey);
		expect(nodeSnapShot.quorumSet?.quorumSet).toEqual(node.quorumSet);
		expect(nodeSnapShot.node.publicKey.value).toEqual(node.publicKey);
		expect(nodeSnapShot.startDate).toEqual(latestNetworkScan.time);
		retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			latestNetworkScan
		);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node.publicKey
			)
		).toEqual(node);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node2.publicKey
			)
		).toEqual(node2);
		/**
		 * Sixth scan: Node not present in network update, but it is only archived after x days of inactivity, thus the snapshot remains active for now
		 */
		networkScan = new NetworkScan();
		node.dateUpdated = networkScan.time;
		node2.dateUpdated = networkScan.time;
		await networkWriteRepository.save(networkScan, new Network([node], []));
		snapShots = await nodeSnapShotRepository.findActive();
		allSnapShots = await nodeSnapShotRepository.find();

		expect(allSnapShots).toHaveLength(5);
		expect(allSnapShots.filter((snapShot) => snapShot.isActive())).toHaveLength(
			2
		);

		expect(snapShots).toHaveLength(2);

		expect(await geoDataRepository.find()).toHaveLength(1);
		expect(await quorumSetRepository.find()).toHaveLength(2);
		retrievedNodes = await findNodesOrThrow(networkReadRepository, networkScan);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node.publicKey
			)
		).toEqual(node);
		const retrievedNode2 = retrievedNodes.find(
			(retrievedNode) => retrievedNode.publicKey === node2.publicKey
		);
		expect(retrievedNode2?.dateUpdated).toEqual(node2.dateUpdated);
		expect(retrievedNode2?.active).toBeFalsy();
		expect(retrievedNode2?.index).toEqual(0);

		/**
		 * Seventh scan: Rediscover node
		 */
		latestNetworkScan = new NetworkScan();
		node.dateUpdated = latestNetworkScan.time;
		node2.dateUpdated = latestNetworkScan.time;
		await networkWriteRepository.save(
			latestNetworkScan,
			new Network([node, node2], [])
		);
		snapShots = await nodeSnapShotRepository.findActive();
		allSnapShots = await nodeSnapShotRepository.find();

		expect(allSnapShots).toHaveLength(5);
		expect(allSnapShots.filter((snapShot) => snapShot.isActive())).toHaveLength(
			2
		);
		expect(snapShots).toHaveLength(2);

		expect(await geoDataRepository.find()).toHaveLength(1); //check if the lat/long storage doesn't trigger a change
		expect(await quorumSetRepository.find()).toHaveLength(2);

		retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			latestNetworkScan
		);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node.publicKey
			)
		).toEqual(node);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node2.publicKey
			)?.dateUpdated
		).toEqual(node2.dateUpdated);
		/**
		 * 8th scan: Ip change
		 */
		node.ip = 'otherLocalhost';

		await networkWriteRepository.save(
			new NetworkScan(),
			new Network([node, node2], [])
		);
		snapShots = await nodeSnapShotRepository.findActive();
		allSnapShots = await nodeSnapShotRepository.find();

		expect(allSnapShots).toHaveLength(6);
		expect(allSnapShots.filter((snapShot) => snapShot.isActive())).toHaveLength(
			2
		);
		expect(snapShots).toHaveLength(2);

		expect(await geoDataRepository.find()).toHaveLength(1);
		expect(await quorumSetRepository.find()).toHaveLength(2);
		/**
		 * 9th scan: Ip change within the same day shouldn't trigger a new snapshot
		 */
		node.ip = 'yetAnotherLocalhost';

		await networkWriteRepository.save(
			new NetworkScan(),
			new Network([node, node2], [])
		);
		snapShots = await nodeSnapShotRepository.findActive();
		allSnapShots = await nodeSnapShotRepository.find();

		expect(allSnapShots).toHaveLength(6);
		expect(allSnapShots.filter((snapShot) => snapShot.isActive())).toHaveLength(
			2
		);
		expect(snapShots).toHaveLength(2);

		expect(await geoDataRepository.find()).toHaveLength(1);
		expect(await quorumSetRepository.find()).toHaveLength(2);
		/**
		 * Check node measurements
		 */
		const nodeMeasurements = await nodeMeasurementRepository.find();
		expect(nodeMeasurements.length).toEqual(18);
		expect(nodeMeasurements[0].isActive).toEqual(node.active);
		expect(nodeMeasurements[0].isValidating).toEqual(node.isValidating);
		expect(nodeMeasurements[0].isFullValidator).toEqual(node.isFullValidator);
		expect(nodeMeasurements[0].isOverLoaded).toEqual(node.overLoaded);
		expect(nodeMeasurements[0].node).toEqual(nodeSnapShot.node);
		/**
		 * check node day measurements (rollup)
		 */
		const thirtyDaysAgo = moment(networkScan.time).subtract(29, 'd').toDate();
		const nodeDayMeasurement = await nodeMeasurementDayRepository.findBetween(
			nodePublicKey,
			thirtyDaysAgo,
			networkScan.time
		);
		expect(nodeDayMeasurement).toHaveLength(1);
		const todayStats = nodeDayMeasurement.find((stat) => {
			return (
				stat.time.getDate() === networkScan.time.getDate() &&
				stat.time.getMonth() === networkScan.time.getMonth()
			);
		});
		expect(todayStats?.crawlCount).toEqual(9);
		expect(todayStats?.isActiveCount).toEqual(9);
		expect(todayStats?.isValidatingCount).toEqual(9);
		expect(todayStats?.isFullValidatorCount).toEqual(9);
		expect(todayStats?.isOverloadedCount).toEqual(0);
		/**
		 * check network measurements
		 */
		const networkMeasurements = await networkMeasurementRepository.find();
		expect(networkMeasurements).toHaveLength(9);

		/**
		 * check network day measurements (rollup)
		 */
		const networkMeasurementsDay = await networkMeasurementDayRepository.find();

		expect(networkMeasurementsDay).toHaveLength(1);
		const networkMeasurementDay = networkMeasurementsDay.find(
			(dayMeasurement) =>
				new Date(dayMeasurement.time).getDay() === new Date().getDay()
		);
		expect(networkMeasurementDay?.hasQuorumIntersectionCount).toEqual(5);
		expect(networkMeasurementDay?.crawlCount).toEqual(9);
		expect(networkMeasurementDay?.nrOfActiveWatchersSum).toEqual(0);
		expect(networkMeasurementDay?.nrOfActiveValidatorsSum).toEqual(17);
		expect(networkMeasurementDay?.nrOfActiveFullValidatorsSum).toEqual(9);
		expect(networkMeasurementDay?.nrOfActiveOrganizationsSum).toEqual(0);
		expect(networkMeasurementDay?.transitiveQuorumSetSizeSum).toEqual(10);

		/**
		 * check network month measurements (rollup)
		 */
		const networkMeasurementsMonth =
			await networkMeasurementMonthRepository.find();
		expect(networkMeasurementsMonth).toHaveLength(1);
		const networkMeasurementMonth = networkMeasurementsMonth[0];
		expect(networkMeasurementMonth.hasQuorumIntersectionCount).toEqual(5);
		expect(networkMeasurementMonth.crawlCount).toEqual(9);
		expect(networkMeasurementMonth.nrOfActiveWatchersSum).toEqual(0);
		expect(networkMeasurementMonth.nrOfActiveValidatorsSum).toEqual(17);
		expect(networkMeasurementMonth.nrOfActiveFullValidatorsSum).toEqual(9);
		expect(networkMeasurementMonth.nrOfActiveOrganizationsSum).toEqual(0);
		expect(networkMeasurementMonth.transitiveQuorumSetSizeSum).toEqual(10);
	});

	test('processNetworkScansWithOrganizations', async () => {
		const organizationId = createDummyOrganizationId();
		const myOrganization = new Organization(
			organizationId.value,
			'My Organization'
		);
		node.organizationId = myOrganization.id;
		node2.organizationId = myOrganization.id;
		myOrganization.validators.push(node.publicKey);
		myOrganization.validators.push(node2.publicKey);
		myOrganization.has30DayStats = false;
		myOrganization.github = 'git';
		myOrganization.subQuorumAvailable = true;
		myOrganization.subQuorum24HoursAvailability = 100;

		/**
		 * First scan
		 */
		let networkScan = new NetworkScan();
		myOrganization.dateDiscovered = networkScan.time;
		const result = await networkWriteRepository.save(
			networkScan,
			new Network([node, node2], [myOrganization])
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isErr()) console.log(result.error);
		await nodeSnapShotRepository.findActive();
		let activeOrganizationSnapShots =
			await organizationSnapShotRepository.findActive();
		let allOrganizationSnapShots = await organizationSnapShotRepository.find();

		expect(activeOrganizationSnapShots).toHaveLength(1);
		expect(allOrganizationSnapShots).toHaveLength(1);
		expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
		expect(
			activeOrganizationSnapShots[0].organization.organizationId.value
		).toEqual(myOrganization.id);
		expect(await organizationRepository.find()).toHaveLength(1);
		myOrganization.has24HourStats = true;
		expect(
			await findOrganizationsOrThrow(networkReadRepository, networkScan)
		).toEqual([myOrganization]);

		/**
		 * Second scan, nothing changed
		 */
		await networkWriteRepository.save(
			new NetworkScan(),
			new Network([node, node2], [myOrganization])
		);
		activeOrganizationSnapShots =
			await organizationSnapShotRepository.findActive();
		allOrganizationSnapShots = await organizationSnapShotRepository.find();

		expect(activeOrganizationSnapShots).toHaveLength(1);
		expect(allOrganizationSnapShots).toHaveLength(1);
		expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
		expect(
			activeOrganizationSnapShots[0].organization.organizationId.value
		).toEqual(myOrganization.id);
		expect(await organizationRepository.find()).toHaveLength(1);
		expect(
			await findOrganizationsOrThrow(networkReadRepository, networkScan)
		).toEqual([myOrganization]);

		/**
		 * third scan, description changed
		 */
		myOrganization.description = 'this is a new description';
		const latestNetworkScanResult = await networkWriteRepository.save(
			new NetworkScan(),
			new Network([node, node2], [myOrganization])
		);
		expect(latestNetworkScanResult.isOk()).toBeTruthy();
		if (latestNetworkScanResult.isErr()) return;
		networkScan = latestNetworkScanResult.value;
		activeOrganizationSnapShots =
			await organizationSnapShotRepository.findActive();
		const activeSnapShot = activeOrganizationSnapShots[0];
		allOrganizationSnapShots = await organizationSnapShotRepository.find();

		expect(activeOrganizationSnapShots).toHaveLength(1);
		expect(allOrganizationSnapShots).toHaveLength(2);
		expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
		expect(activeOrganizationSnapShots[0].description).toEqual(
			myOrganization.description
		);
		expect(
			activeOrganizationSnapShots[0].organization.organizationId.value
		).toEqual(myOrganization.id);
		expect(await organizationRepository.find()).toHaveLength(1);
		expect(
			activeOrganizationSnapShots[0].validators.map(
				(validator) => validator.value
			)
		).toEqual([node.publicKey, node2.publicKey]);
		expect(
			await findOrganizationsOrThrow(networkReadRepository, networkScan)
		).toEqual([myOrganization]);
		/**
		 * organization archived in snapshots. Rediscovery should trigger a new snapshot
		 */
		myOrganization.description = 'this is a new description';
		activeSnapShot.endDate = networkScan.time;
		await organizationSnapShotRepository.save(activeSnapShot);

		await networkWriteRepository.save(
			new NetworkScan(),
			new Network([node, node2], [myOrganization])
		);
		activeOrganizationSnapShots =
			await organizationSnapShotRepository.findActive();
		allOrganizationSnapShots = await organizationSnapShotRepository.find();

		expect(activeOrganizationSnapShots).toHaveLength(1);
		expect(allOrganizationSnapShots).toHaveLength(3);
		expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
		expect(activeOrganizationSnapShots[0].description).toEqual(
			myOrganization.description
		);
		expect(
			activeOrganizationSnapShots[0].organization.organizationId.value
		).toEqual(myOrganization.id);
		expect(await organizationRepository.find()).toHaveLength(1);
		expect(
			activeOrganizationSnapShots[0].validators.map(
				(validator) => validator.value
			)
		).toEqual([node.publicKey, node2.publicKey]);

		/**
		 * Nodes change organization
		 */
		const myNewOrganization = new Organization(
			'anotherId',
			'My new Organization'
		);
		node.organizationId = myNewOrganization.id;
		node2.organizationId = myNewOrganization.id;
		myNewOrganization.validators.push(node.publicKey);
		myNewOrganization.validators.push(node2.publicKey);
		myOrganization.validators = [];
		await networkWriteRepository.save(
			new NetworkScan(),
			new Network([node, node2], [myOrganization, myNewOrganization])
		);
		activeOrganizationSnapShots =
			await organizationSnapShotRepository.findActive();
		allOrganizationSnapShots = await organizationSnapShotRepository.find();

		expect(activeOrganizationSnapShots).toHaveLength(1); //old organization is archived
		expect(allOrganizationSnapShots).toHaveLength(4);
		expect(await organizationRepository.find()).toHaveLength(2);
		expect(
			activeOrganizationSnapShots
				.find(
					(org) =>
						org.organization.organizationId.value === myNewOrganization.id
				)
				?.validators.map((validator) => validator.value)
		).toEqual([node.publicKey, node2.publicKey]);

		/**
		 * check organization day measurements (rollup)
		 */
		const versionedOrg = await organizationRepository.findByOrganizationId(
			organizationId
		);

		const organizationMeasurementsDay =
			await organizationMeasurementDayRepository.find({
				where: {
					organization: versionedOrg
				}
			});

		expect(organizationMeasurementsDay).toHaveLength(1);
		expect(organizationMeasurementsDay[0].crawlCount).toEqual(4);
		expect(organizationMeasurementsDay[0].isSubQuorumAvailableCount).toEqual(4);
		expect(organizationMeasurementsDay[0].indexSum).toEqual(0);
	});

	test('organization measurements and subquorum Availability', async () => {
		const organizationId = createDummyOrganizationId();
		const myOrganization = new Organization(
			organizationId.value,
			'My Organization'
		);
		myOrganization.validators.push(node.publicKey);
		myOrganization.validators.push(node2.publicKey);
		node.organizationId = myOrganization.id;
		node2.organizationId = myOrganization.id;
		node.isValidating = true;
		node2.isValidating = false;

		await networkWriteRepository.save(
			new NetworkScan(),
			new Network([node, node2], [myOrganization])
		);
		let organizationMeasurements =
			await organizationMeasurementRepository.find();
		expect(organizationMeasurements).toHaveLength(1);
		expect(
			organizationMeasurements.filter(
				(organizationMeasurement) =>
					organizationMeasurement.isSubQuorumAvailable
			)
		).toHaveLength(1);
		expect(
			organizationMeasurements.filter(
				(organizationMeasurement) =>
					!organizationMeasurement.isSubQuorumAvailable
			)
		).toHaveLength(0);
		expect(organizationMeasurements[0]?.index).toEqual(0);

		node.isValidating = false;
		await networkWriteRepository.save(
			new NetworkScan(),
			new Network([node, node2], [myOrganization])
		);
		organizationMeasurements = await organizationMeasurementRepository.find();
		expect(organizationMeasurements).toHaveLength(2);
		expect(
			organizationMeasurements.filter(
				(organizationMeasurement) =>
					organizationMeasurement.isSubQuorumAvailable
			)
		).toHaveLength(1);
		expect(
			organizationMeasurements.filter(
				(organizationMeasurement) =>
					!organizationMeasurement.isSubQuorumAvailable
			)
		).toHaveLength(1);

		/**
		 * organization not present in update, it is archived
		 */
		node.isValidating = true;
		await networkWriteRepository.save(
			new NetworkScan(),
			new Network([node, node2])
		);
		organizationMeasurements = await organizationMeasurementRepository.find();
		expect(organizationMeasurements).toHaveLength(2);
		expect(
			organizationMeasurements.filter(
				(organizationMeasurement) =>
					organizationMeasurement.isSubQuorumAvailable
			)
		).toHaveLength(1);
		expect(
			organizationMeasurements.filter(
				(organizationMeasurement) =>
					!organizationMeasurement.isSubQuorumAvailable
			)
		).toHaveLength(1);
	});
});
