import { Connection, Repository } from 'typeorm';

import NodeSnapShotRepository from '../../infrastructure/database/repositories/NodeSnapShotRepository';
import {
	Network,
	NetworkReadRepository,
	Node,
	Organization
} from '@stellarbeat/js-stellar-domain';
import NodeGeoDataStorage from '../../infrastructure/database/entities/NodeGeoDataStorage';
import NodeQuorumSetStorage from '../../infrastructure/database/entities/NodeQuorumSetStorage';
import { NetworkWriteRepository } from '../NetworkWriteRepository';
import OrganizationIdStorage from '../../infrastructure/database/entities/OrganizationIdStorage';
import OrganizationSnapShotRepository from '../../infrastructure/database/repositories/OrganizationSnapShotRepository';
import OrganizationMeasurement from '../../infrastructure/database/entities/OrganizationMeasurement';
import NetworkMeasurement from '../../infrastructure/database/entities/NetworkMeasurement';
import { OrganizationMeasurementDayRepository } from '../../infrastructure/database/repositories/OrganizationMeasurementDayRepository';
import { NetworkMeasurementDayRepository } from '../../infrastructure/database/repositories/NetworkMeasurementDayRepository';
import NetworkUpdate from '../../domain/NetworkUpdate';
import NodeSnapShot from '../../infrastructure/database/entities/NodeSnapShot';
import { Container } from 'inversify';
import { NodeMeasurementV2Repository } from '../../infrastructure/database/repositories/NodeMeasurementV2Repository';
import Kernel from '../../../core/infrastructure/Kernel';
import moment = require('moment');
import NodeMeasurementService from '../../infrastructure/database/repositories/NodeMeasurementService';
import { NetworkMeasurementMonthRepository } from '../../infrastructure/database/repositories/NetworkMeasurementMonthRepository';
import { ConfigMock } from '../../../core/config/__mocks__/configMock';
import NodeDetailsStorage from '../../infrastructure/database/entities/NodeDetailsStorage';
import { TestUtils } from '../../../core/utilities/TestUtils';
import { TYPES } from '../../../core/infrastructure/di/di-types';

async function findNetworkOrThrow(
	networkReadRepository: NetworkReadRepository,
	networkUpdate: NetworkUpdate
): Promise<Network> {
	const retrievedNetwork = await networkReadRepository.getNetwork(
		networkUpdate.time
	);
	if (retrievedNetwork.isErr()) throw retrievedNetwork.error;
	if (retrievedNetwork.value === null) throw new Error('Network not found');

	return retrievedNetwork.value;
}

async function findNodesOrThrow(
	networkReadRepository: NetworkReadRepository,
	networkUpdate: NetworkUpdate
): Promise<Node[]> {
	const retrievedNetwork = await findNetworkOrThrow(
		networkReadRepository,
		networkUpdate
	);
	return retrievedNetwork.nodes;
}

async function findOrganizationsOrThrow(
	networkReadRepository: NetworkReadRepository,
	networkUpdate: NetworkUpdate
) {
	const retrievedNetwork = await findNetworkOrThrow(
		networkReadRepository,
		networkUpdate
	);
	return retrievedNetwork.organizations;
}

describe('multiple network updates', () => {
	jest.setTimeout(600000); //slow and long integration test
	let container: Container;
	let node: Node;
	let node2: Node;
	let geoDataRepository: Repository<NodeGeoDataStorage>;
	let quorumSetRepository: Repository<NodeQuorumSetStorage>;
	let networkUpdateProcessor: NetworkWriteRepository;
	let nodeSnapShotRepository: NodeSnapShotRepository;
	let organizationSnapShotRepository: OrganizationSnapShotRepository;
	let organizationIdStorageRepository: Repository<OrganizationIdStorage>;
	let nodeMeasurementV2Repository: NodeMeasurementV2Repository;
	let organizationMeasurementDayRepository: OrganizationMeasurementDayRepository;
	let organizationMeasurementRepository: Repository<OrganizationMeasurement>;
	let networkMeasurementRepository: Repository<NetworkMeasurement>;
	let networkMeasurementDayRepository: NetworkMeasurementDayRepository;
	let networkMeasurementMonthRepository: NetworkMeasurementMonthRepository;
	let networkReadRepository: NetworkReadRepository;
	let nodeMeasurementsService: NodeMeasurementService;
	let kernel: Kernel;

	beforeAll(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
	});

	beforeEach(async () => {
		node = new Node('A', 'localhost', 1);
		node.versionStr = 'v1';
		node.active = true;
		node.isFullValidator = true;
		node.index = 0.95;
		node.isValidating = true;
		node.overLoaded = false;
		node2 = new Node('B', 'otherHost', 1);
		node2.versionStr = 'v1';
		node2.active = true;
		node2.isFullValidator = false;
		node2.index = 0.91;
		node2.isValidating = true;
		node2.quorumSetHashKey = 'aKey';
		node2.quorumSet.threshold = 1;
		node2.quorumSet.validators.push('A');
		node2.overLoaded = true;
		node.statistics.has30DayStats = false;
		node.statistics.active24HoursPercentage = 100;
		node.statistics.validating24HoursPercentage = 100;
		node.statistics.overLoaded24HoursPercentage = 0;
		node2.statistics.has30DayStats = false;
		node2.statistics.active24HoursPercentage = 100;
		node2.statistics.validating24HoursPercentage = 100;
		node2.statistics.overLoaded24HoursPercentage = 100;
		nodeSnapShotRepository = container.get(NodeSnapShotRepository);
		geoDataRepository = container.get('Repository<NodeGeoDataStorage>');
		quorumSetRepository = container.get('Repository<NodeQuorumSetStorage>');
		organizationSnapShotRepository = container.get(
			OrganizationSnapShotRepository
		);
		organizationIdStorageRepository = container.get(
			'OrganizationIdStorageRepository'
		);
		organizationMeasurementRepository = container.get(
			'Repository<OrganizationMeasurement>'
		);
		organizationMeasurementDayRepository = container.get(
			OrganizationMeasurementDayRepository
		);
		networkMeasurementDayRepository = container.get(
			NetworkMeasurementDayRepository
		);
		networkMeasurementMonthRepository = container.get(
			NetworkMeasurementMonthRepository
		);
		networkUpdateProcessor = container.get(NetworkWriteRepository);
		networkReadRepository = container.get<NetworkReadRepository>(
			TYPES.NetworkReadRepository
		);
		nodeMeasurementV2Repository = container.get(NodeMeasurementV2Repository);
		networkMeasurementRepository = container.get(
			'Repository<NetworkMeasurement>'
		);
		nodeMeasurementsService = container.get(NodeMeasurementService);
	});

	afterEach(async () => {
		await TestUtils.resetDB(kernel.container.get(Connection));
	});

	afterAll(async () => {
		await kernel.close();
	});

	//todo: test should be split up with mockdata in database
	test('processNetworkUpdateWithoutOrganizations', async () => {
		/**
		 * First update for node
		 */
		let networkUpdate = new NetworkUpdate();
		node.dateDiscovered = networkUpdate.time;
		node.dateUpdated = networkUpdate.time;
		node2.dateDiscovered = networkUpdate.time;
		node2.dateUpdated = networkUpdate.time;
		await networkUpdateProcessor.save(
			networkUpdate,
			new Network([node, node2])
		);

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
		expect((nodeSnapShot.nodeDetails as NodeDetailsStorage).versionStr).toEqual(
			node.versionStr
		);
		expect((nodeSnapShot.nodeDetails as NodeDetailsStorage).versionStr).toEqual(
			node.versionStr
		);
		expect(nodeSnapShot.quorumSet).toBeNull();
		expect(nodeSnapShot.organizationIdStorage).toBeNull(); //not yet loaded from database
		expect(nodeSnapShot.nodePublicKey.publicKey).toEqual(node.publicKey);
		expect(nodeSnapShot.nodePublicKey.dateDiscovered).toEqual(
			networkUpdate.time
		);
		expect(await nodeSnapShot.startDate).toEqual(networkUpdate.time);

		let retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			networkUpdate
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
		 * Second networkUpdate with equal node
		 */
		networkUpdate = new NetworkUpdate();
		node.dateUpdated = networkUpdate.time;
		node2.dateUpdated = networkUpdate.time;
		await networkUpdateProcessor.save(
			networkUpdate,
			new Network([node, node2])
		);
		snapShots = await nodeSnapShotRepository.findActive();
		let allSnapShots = await nodeSnapShotRepository.find();
		expect(snapShots).toHaveLength(2);
		expect(allSnapShots).toHaveLength(2);

		retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			networkUpdate
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
		 * third networkUpdate with new geo data for node
		 */
		let latestNetworkUpdate = new NetworkUpdate();

		node.dateUpdated = latestNetworkUpdate.time;
		node2.dateUpdated = latestNetworkUpdate.time;

		node.geoData.latitude = 20.815460205078125;
		node.geoData.longitude = 0;

		node.geoData.countryCode = 'US';
		node.geoData.countryName = 'United States';

		let latestNetworkUpdateResult = await networkUpdateProcessor.save(
			latestNetworkUpdate,
			new Network([node, node2])
		);
		expect(latestNetworkUpdateResult.isOk()).toBeTruthy();
		if (latestNetworkUpdateResult.isErr()) return;
		latestNetworkUpdate = latestNetworkUpdateResult.value;
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
		expect(nodeSnapShot.geoData!.countryCode).toEqual(node.geoData.countryCode);
		expect(nodeSnapShot.geoData!.countryName).toEqual(node.geoData.countryName);
		expect(nodeSnapShot.geoData!.latitude).toEqual(node.geoData.latitude);

		expect(nodeSnapShot.ip).toEqual(node.ip);
		expect(nodeSnapShot.port).toEqual(node.port);
		expect(nodeSnapShot.nodeDetails).toBeDefined();
		expect(nodeSnapShot.nodeDetails!.versionStr).toEqual(node.versionStr);
		expect(nodeSnapShot.quorumSet).toBeNull();
		expect(nodeSnapShot.organizationIdStorage).toBeNull();
		expect(nodeSnapShot.nodePublicKey.publicKey).toEqual(node.publicKey);
		expect(nodeSnapShot.startDate).toEqual(latestNetworkUpdate.time);

		retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			latestNetworkUpdate
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
		 * fourth networkUpdate with quorumset data for node 1
		 */
		latestNetworkUpdate = new NetworkUpdate();

		node.dateUpdated = latestNetworkUpdate.time;
		node2.dateUpdated = latestNetworkUpdate.time;
		node.quorumSet.threshold = 2;
		node.quorumSet.validators.push(...[node.publicKey, node2.publicKey]);
		node.quorumSetHashKey = 'IfIhR7AFvJ2YCS50O6blib1+gEaP87IwuTRgv/HEbbg=';

		latestNetworkUpdateResult = await networkUpdateProcessor.save(
			latestNetworkUpdate,
			new Network([node, node2], [])
		);
		expect(latestNetworkUpdateResult.isOk()).toBeTruthy();
		if (latestNetworkUpdateResult.isErr()) return;
		latestNetworkUpdate = latestNetworkUpdateResult.value;
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
		)!;

		expect(nodeSnapShot.endDate).toEqual(NodeSnapShot.MAX_DATE);

		expect(nodeSnapShot.ip).toEqual(node.ip);
		expect(nodeSnapShot.port).toEqual(node.port);
		expect(nodeSnapShot.nodeDetails).toBeDefined();
		expect(nodeSnapShot.nodeDetails!.versionStr).toEqual(node.versionStr);
		expect(nodeSnapShot.quorumSet).toBeDefined();
		expect(nodeSnapShot.quorumSet!.hash).toEqual(node.quorumSetHashKey);
		expect(nodeSnapShot.quorumSet!.quorumSet).toEqual(node.quorumSet);
		expect(nodeSnapShot.organizationIdStorage).toBeNull();
		expect(nodeSnapShot.nodePublicKey.publicKey).toEqual(node.publicKey);
		expect(nodeSnapShot.startDate).toEqual(latestNetworkUpdate.time);

		retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			latestNetworkUpdate
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
		 * Fifth networkUpdate with new node details for node
		 */
		node.historyUrl = 'https://my-history.com';
		latestNetworkUpdate = new NetworkUpdate();
		node.dateUpdated = latestNetworkUpdate.time;
		node2.dateUpdated = latestNetworkUpdate.time;
		latestNetworkUpdateResult = await networkUpdateProcessor.save(
			latestNetworkUpdate,
			new Network([node, node2], [])
		);
		expect(latestNetworkUpdateResult.isOk()).toBeTruthy();
		if (latestNetworkUpdateResult.isErr()) return;
		latestNetworkUpdate = latestNetworkUpdateResult.value;
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
		)!;

		expect(snapShots).toHaveLength(2);
		expect(nodeSnapShot.endDate).toEqual(NodeSnapShot.MAX_DATE);
		expect(nodeSnapShot.geoData).toBeDefined();
		expect(nodeSnapShot.geoData!.countryCode).toEqual(node.geoData.countryCode);
		expect(nodeSnapShot.geoData!.countryName).toEqual(node.geoData.countryName);
		expect(nodeSnapShot.geoData!.longitude).toEqual(node.geoData.longitude);
		expect(nodeSnapShot.geoData!.latitude).toEqual(node.geoData.latitude);
		expect(await geoDataRepository.find()).toHaveLength(1); //check if the lat/long storage doesn't trigger a change
		expect(await quorumSetRepository.find()).toHaveLength(2);

		expect(nodeSnapShot.ip).toEqual(node.ip);
		expect(nodeSnapShot.port).toEqual(node.port);
		expect(nodeSnapShot.nodeDetails).toBeDefined();
		expect(nodeSnapShot.nodeDetails!.versionStr).toEqual(node.versionStr);
		expect(nodeSnapShot.nodeDetails!.historyUrl).toEqual(node.historyUrl);
		expect(nodeSnapShot.quorumSet).toBeDefined();
		expect(nodeSnapShot.quorumSet!.hash).toEqual(node.quorumSetHashKey);
		expect(nodeSnapShot.quorumSet!.quorumSet).toEqual(node.quorumSet);
		expect(nodeSnapShot.organizationIdStorage).toBeNull();
		expect(nodeSnapShot.nodePublicKey.publicKey).toEqual(node.publicKey);
		expect(nodeSnapShot.startDate).toEqual(latestNetworkUpdate.time);
		retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			latestNetworkUpdate
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
		 * Sixth networkUpdate: Node not present in network update, but it is only archived after x days of inactivity, thus the snapshot remains active for now
		 */
		networkUpdate = new NetworkUpdate();
		node.dateUpdated = networkUpdate.time;
		node2.dateUpdated = networkUpdate.time;
		await networkUpdateProcessor.save(networkUpdate, new Network([node], []));
		snapShots = await nodeSnapShotRepository.findActive();
		allSnapShots = await nodeSnapShotRepository.find();

		expect(allSnapShots).toHaveLength(5);
		expect(allSnapShots.filter((snapShot) => snapShot.isActive())).toHaveLength(
			2
		);

		expect(snapShots).toHaveLength(2);

		expect(await geoDataRepository.find()).toHaveLength(1);
		expect(await quorumSetRepository.find()).toHaveLength(2);
		retrievedNodes = await findNodesOrThrow(
			networkReadRepository,
			networkUpdate
		);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node.publicKey
			)
		).toEqual(node);
		const retrievedNode2 = retrievedNodes.find(
			(retrievedNode) => retrievedNode.publicKey === node2.publicKey
		)!;
		expect(retrievedNode2.dateUpdated).toEqual(node2.dateUpdated);
		expect(retrievedNode2.active).toBeFalsy();
		expect(retrievedNode2.index).toEqual(0);

		/**
		 * Seventh networkUpdate: Rediscover node
		 */
		latestNetworkUpdate = new NetworkUpdate();
		node.dateUpdated = latestNetworkUpdate.time;
		node2.dateUpdated = latestNetworkUpdate.time;
		await networkUpdateProcessor.save(
			latestNetworkUpdate,
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
			latestNetworkUpdate
		);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node.publicKey
			)
		).toEqual(node);
		expect(
			retrievedNodes.find(
				(retrievedNode) => retrievedNode.publicKey === node2.publicKey
			)!.dateUpdated
		).toEqual(node2.dateUpdated);

		/**
		 * 8th networkUpdate: Ip change
		 */
		node.ip = 'otherLocalhost';

		await networkUpdateProcessor.save(
			new NetworkUpdate(),
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
		 * 9th networkUpdate: Ip change within the same day shouldn't trigger a new snapshot
		 */
		node.ip = 'yetAnotherLocalhost';

		await networkUpdateProcessor.save(
			new NetworkUpdate(),
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
		const nodeMeasurements = await nodeMeasurementV2Repository.find();
		expect(nodeMeasurements.length).toEqual(18);
		expect(nodeMeasurements[0].isActive).toEqual(node.active);
		expect(nodeMeasurements[0].isValidating).toEqual(node.isValidating);
		expect(nodeMeasurements[0].isFullValidator).toEqual(node.isFullValidator);
		expect(nodeMeasurements[0].isOverLoaded).toEqual(node.overLoaded);
		expect(nodeMeasurements[0].nodePublicKeyStorage).toEqual(
			nodeSnapShot.nodePublicKey
		);

		/**
		 * check node day measurements (rollup)
		 */

		const thirtyDaysAgo = moment(networkUpdate.time).subtract(29, 'd').toDate();
		const nodeDayMeasurement =
			await nodeMeasurementsService.getNodeDayMeasurements(
				node.publicKey!,
				thirtyDaysAgo,
				networkUpdate.time
			);
		expect(nodeDayMeasurement).toHaveLength(30);
		const todayStats = nodeDayMeasurement.find((stat) => {
			return (
				stat.time.getDate() === networkUpdate.time.getDate() &&
				stat.time.getMonth() === networkUpdate.time.getMonth()
			);
		});
		expect(todayStats!.crawlCount).toEqual(9);
		expect(todayStats!.isActiveCount).toEqual(9);
		expect(todayStats!.isValidatingCount).toEqual(9);
		expect(todayStats!.isFullValidatorCount).toEqual(9);
		expect(todayStats!.isOverloadedCount).toEqual(0);

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
		)!;
		expect(networkMeasurementDay.hasQuorumIntersectionCount).toEqual(5);
		expect(networkMeasurementDay.crawlCount).toEqual(9);
		expect(networkMeasurementDay.nrOfActiveWatchersSum).toEqual(0);
		expect(networkMeasurementDay.nrOfActiveValidatorsSum).toEqual(17);
		expect(networkMeasurementDay.nrOfActiveFullValidatorsSum).toEqual(9);
		expect(networkMeasurementDay.nrOfActiveOrganizationsSum).toEqual(0);
		expect(networkMeasurementDay.transitiveQuorumSetSizeSum).toEqual(10);

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

	test('processNetworkUpdatesWithOrganizations', async () => {
		const myOrganization = new Organization('orgId', 'My Organization');
		node.organizationId = myOrganization.id;
		node2.organizationId = myOrganization.id;
		myOrganization.validators.push(node.publicKey!);
		myOrganization.validators.push(node2.publicKey!);
		myOrganization.has30DayStats = false;
		myOrganization.github = 'git';
		myOrganization.subQuorumAvailable = true;
		myOrganization.subQuorum24HoursAvailability = 100;

		/**
		 * First networkUpdate
		 */
		let networkUpdate = new NetworkUpdate();
		myOrganization.dateDiscovered = networkUpdate.time;
		await networkUpdateProcessor.save(
			networkUpdate,
			new Network([node, node2], [myOrganization])
		);
		let activeNodeSnapShots = await nodeSnapShotRepository.findActive();
		let activeOrganizationSnapShots =
			await organizationSnapShotRepository.findActive();
		let allOrganizationSnapShots = await organizationSnapShotRepository.find();

		expect(activeOrganizationSnapShots).toHaveLength(1);
		expect(allOrganizationSnapShots).toHaveLength(1);
		expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
		expect(
			activeOrganizationSnapShots[0].organizationIdStorage.organizationId
		).toEqual(myOrganization.id);
		expect(await organizationIdStorageRepository.find()).toHaveLength(1);
		expect(
			activeNodeSnapShots.filter(
				(nodeSnapShot) =>
					nodeSnapShot.organizationIdStorage!.organizationId ===
					myOrganization.id
			)
		).toHaveLength(2);
		myOrganization.has24HourStats = true;
		expect(
			await findOrganizationsOrThrow(networkReadRepository, networkUpdate)
		).toEqual([myOrganization]);

		/**
		 * Second networkUpdate, nothing changed
		 */
		await networkUpdateProcessor.save(
			new NetworkUpdate(),
			new Network([node, node2], [myOrganization])
		);
		activeNodeSnapShots = await nodeSnapShotRepository.findActive();
		activeOrganizationSnapShots =
			await organizationSnapShotRepository.findActive();
		allOrganizationSnapShots = await organizationSnapShotRepository.find();

		expect(activeOrganizationSnapShots).toHaveLength(1);
		expect(allOrganizationSnapShots).toHaveLength(1);
		expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
		expect(
			activeOrganizationSnapShots[0].organizationIdStorage.organizationId
		).toEqual(myOrganization.id);
		expect(await organizationIdStorageRepository.find()).toHaveLength(1);
		expect(
			activeNodeSnapShots.filter(
				(nodeSnapShot) =>
					nodeSnapShot.organizationIdStorage!.organizationId ===
					myOrganization.id
			)
		).toHaveLength(2);
		expect(
			await findOrganizationsOrThrow(networkReadRepository, networkUpdate)
		).toEqual([myOrganization]);

		/**
		 * third networkUpdate, description changed
		 */
		myOrganization.description = 'this is a new description';
		const latestNetworkUpdateResult = await networkUpdateProcessor.save(
			new NetworkUpdate(),
			new Network([node, node2], [myOrganization])
		);
		expect(latestNetworkUpdateResult.isOk()).toBeTruthy();
		if (latestNetworkUpdateResult.isErr()) return;
		networkUpdate = latestNetworkUpdateResult.value;
		activeNodeSnapShots = await nodeSnapShotRepository.findActive();
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
			activeOrganizationSnapShots[0].organizationIdStorage.organizationId
		).toEqual(myOrganization.id);
		expect(await organizationIdStorageRepository.find()).toHaveLength(1);
		expect(
			activeNodeSnapShots.filter(
				(nodeSnapShot) =>
					nodeSnapShot.organizationIdStorage!.organizationId ===
					myOrganization.id
			)
		).toHaveLength(2);
		expect(
			activeOrganizationSnapShots[0].validators.map(
				(validator) => validator.publicKey
			)
		).toEqual([node.publicKey, node2.publicKey]);
		expect(
			await findOrganizationsOrThrow(networkReadRepository, networkUpdate)
		).toEqual([myOrganization]);

		/**
		 * organization archived in snapshots. Rediscovery should trigger a new snapshot
		 */
		myOrganization.description = 'this is a new description';
		activeSnapShot.endDate = networkUpdate.time;
		await organizationSnapShotRepository.save(activeSnapShot);
		await networkUpdateProcessor.save(
			new NetworkUpdate(),
			new Network([node, node2], [myOrganization])
		);
		activeNodeSnapShots = await nodeSnapShotRepository.findActive();
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
			activeOrganizationSnapShots[0].organizationIdStorage.organizationId
		).toEqual(myOrganization.id);
		expect(await organizationIdStorageRepository.find()).toHaveLength(1);
		expect(
			activeNodeSnapShots.filter(
				(nodeSnapShot) =>
					nodeSnapShot.organizationIdStorage!.organizationId ===
					myOrganization.id
			)
		).toHaveLength(2);
		expect(
			activeOrganizationSnapShots[0].validators.map(
				(validator) => validator.publicKey
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
		myNewOrganization.validators.push(node.publicKey!);
		myNewOrganization.validators.push(node2.publicKey!);
		myOrganization.validators = [];
		await networkUpdateProcessor.save(
			new NetworkUpdate(),
			new Network([node, node2], [myOrganization, myNewOrganization])
		);

		activeNodeSnapShots = await nodeSnapShotRepository.findActive();
		activeOrganizationSnapShots =
			await organizationSnapShotRepository.findActive();
		allOrganizationSnapShots = await organizationSnapShotRepository.find();

		expect(activeOrganizationSnapShots).toHaveLength(1); //old organization is archived
		expect(allOrganizationSnapShots).toHaveLength(4);
		expect(await organizationIdStorageRepository.find()).toHaveLength(2);
		expect(
			activeNodeSnapShots.filter(
				(nodeSnapShot) =>
					nodeSnapShot.organizationIdStorage!.organizationId ===
					myNewOrganization.id
			)
		).toHaveLength(2);
		expect(
			activeOrganizationSnapShots
				.find(
					(org) =>
						org.organizationIdStorage.organizationId === myNewOrganization.id
				)!
				.validators.map((validator) => validator.publicKey)
		).toEqual([node.publicKey, node2.publicKey]);

		/**
		 * check organization day measurements (rollup)
		 */
		const organizationIdStorage = await organizationIdStorageRepository.findOne(
			{
				where: {
					organizationId: myOrganization.id
				}
			}
		);

		const organizationMeasurementsDay =
			await organizationMeasurementDayRepository.find({
				where: {
					organizationIdStorage: organizationIdStorage
				}
			});

		expect(organizationMeasurementsDay).toHaveLength(1);
		expect(organizationMeasurementsDay[0].crawlCount).toEqual(4);
		expect(organizationMeasurementsDay[0].isSubQuorumAvailableCount).toEqual(4);
		expect(organizationMeasurementsDay[0].indexSum).toEqual(0);
	});

	test('organization measurements and subquorum Availability', async () => {
		const myOrganization = new Organization('orgId', 'My Organization');
		myOrganization.validators.push(node.publicKey);
		myOrganization.validators.push(node2.publicKey);
		node.organizationId = myOrganization.id;
		node2.organizationId = myOrganization.id;
		node.isValidating = true;
		node2.isValidating = false;

		await networkUpdateProcessor.save(
			new NetworkUpdate(),
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
		expect(organizationMeasurements[0]!.index).toEqual(0);

		node.isValidating = false;
		await networkUpdateProcessor.save(
			new NetworkUpdate(),
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
		await networkUpdateProcessor.save(
			new NetworkUpdate(),
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
