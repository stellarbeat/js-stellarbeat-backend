import {Connection, Repository} from "typeorm";

import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import NodeGeoDataStorage from "../../src/entities/NodeGeoDataStorage";
import NodeQuorumSetStorage from "../../src/entities/NodeQuorumSetStorage";
import {CrawlResultProcessor} from "../../src/services/CrawlResultProcessor";
import OrganizationIdStorage from "../../src/entities/OrganizationIdStorage";
import OrganizationSnapShotRepository from "../../src/repositories/OrganizationSnapShotRepository";
import {NodePublicKeyStorageRepository} from "../../src/entities/NodePublicKeyStorage";
import OrganizationMeasurement from "../../src/entities/OrganizationMeasurement";
import NetworkMeasurement from "../../src/entities/NetworkMeasurement";
import {
    NodeMeasurementDayV2Repository
} from "../../src/repositories/NodeMeasurementDayV2Repository";
import {OrganizationMeasurementDayRepository} from "../../src/repositories/OrganizationMeasurementDayRepository";
import {NetworkMeasurementDayRepository} from "../../src/repositories/NetworkMeasurementDayRepository";
import CrawlV2 from "../../src/entities/CrawlV2";
import CrawlV2Service from "../../src/services/CrawlV2Service";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import {Container} from "inversify";
import {NodeMeasurementV2Repository} from "../../src/repositories/NodeMeasurementV2Repository";
import Kernel from "../../src/Kernel";
import moment = require("moment");
import NodeMeasurementService from "../../src/services/NodeMeasurementService";
import FbasAnalyzerService from "../../src/services/FbasAnalyzerService";
import {NetworkMeasurementMonthRepository} from "../../src/repositories/NetworkMeasurementMonthRepository";

describe("multiple crawls", () => {
    jest.setTimeout(60000); //slow and long integration test
    let container:Container;
    let node: Node;
    let node2: Node;
    let geoDataRepository: Repository<NodeGeoDataStorage>;
    let quorumSetRepository: Repository<NodeQuorumSetStorage>;
    let crawlResultProcessor: CrawlResultProcessor;
    let nodeSnapShotRepository: NodeSnapShotRepository;
    let organizationSnapShotRepository: OrganizationSnapShotRepository;
    let organizationIdStorageRepository: Repository<OrganizationIdStorage>;
    let nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
    let nodeMeasurementV2Repository: NodeMeasurementV2Repository;
    let organizationMeasurementDayRepository: OrganizationMeasurementDayRepository;
    let organizationMeasurementRepository: Repository<OrganizationMeasurement>;
    let networkMeasurementRepository: Repository<NetworkMeasurement>;
    let networkMeasurementDayRepository: NetworkMeasurementDayRepository;
    let networkMeasurementMonthRepository: NetworkMeasurementMonthRepository;
    let crawlV2Service: CrawlV2Service;
    let nodeMeasurementsService: NodeMeasurementService;
    let kernel = new Kernel();


    beforeEach(async () => {
        await kernel.initializeContainer();
        container = kernel.container;
        let fbasAnalyzerMock = {
            performAnalysis: () => { return {
                cache_hit: false,
                has_quorum_intersection: true,
                has_quorum_intersection_faulty_nodes_filtered: true,
                minimal_blocking_sets: [['A', 'B', 'C', 'D']],
                minimal_blocking_sets_faulty_nodes_filtered: [['A', 'B', 'C']],
                org_minimal_blocking_sets: [['A', 'B']],
                org_minimal_blocking_sets_faulty_nodes_filtered:[['A']],
                minimal_splitting_sets: [['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']],
                minimal_splitting_sets_faulty_nodes_filtered: [['A', 'B', 'C', 'D', 'E', 'F', 'G']],
                org_minimal_splitting_sets: [['A', 'B', 'C', 'D', 'E', 'F']],
                org_minimal_splitting_sets_faulty_nodes_filtered:[['A', 'B', 'C', 'D', 'E']],
                top_tier: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
                top_tier_faulty_nodes_filtered: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
                org_top_tier: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
                org_top_tier_faulty_nodes_filtered: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
            } }
        };
        container.unbind(FbasAnalyzerService);
        // @ts-ignore
        container.bind(FbasAnalyzerService).toConstantValue(fbasAnalyzerMock);
        node = new Node('localhost', 1, 'A');
        node.versionStr = 'v1';
        node.active = true;
        node.isFullValidator = true;
        node.index = 0.95;
        node.isValidating = true;
        node.overLoaded = false;
        node.statistics.overLoadedInLastCrawl = false;
        node.statistics.activeInLastCrawl = true;
        node.statistics.validatingInLastCrawl = true;
        node2 = new Node('otherHost', 1, 'B');
        node2.versionStr = 'v1';
        node2.active = true;
        node2.isFullValidator = false;
        node2.index = 0.91;
        node2.isValidating = true;
        node2.quorumSet.hashKey = 'aKey';
        node2.quorumSet.threshold = 1;
        node2.quorumSet.validators.push('A');
        node2.overLoaded = true;
        node.statistics.overLoadedInLastCrawl = false;
        node.statistics.activeInLastCrawl = true;
        node.statistics.validatingInLastCrawl = true;
        node.statistics.has30DayStats = false;
        node.statistics.active24HoursPercentage = 100;
        node.statistics.validating24HoursPercentage = 100;
        node.statistics.overLoaded24HoursPercentage = 0;
        node2.statistics.overLoadedInLastCrawl = true;
        node2.statistics.activeInLastCrawl = true;
        node2.statistics.validatingInLastCrawl = true;
        node2.statistics.has30DayStats = false;
        node2.statistics.active24HoursPercentage = 100;
        node2.statistics.validating24HoursPercentage = 100;
        node2.statistics.overLoaded24HoursPercentage = 100;
        nodeSnapShotRepository = container.get(NodeSnapShotRepository);
        geoDataRepository = container.get('Repository<NodeGeoDataStorage>');
        quorumSetRepository = container.get('Repository<NodeQuorumSetStorage>');
        organizationSnapShotRepository = container.get(OrganizationSnapShotRepository);
        organizationIdStorageRepository = container.get('OrganizationIdStorageRepository');
        nodeMeasurementDayV2Repository = container.get(NodeMeasurementDayV2Repository);
        organizationMeasurementRepository = container.get('Repository<OrganizationMeasurement>');
        organizationMeasurementDayRepository = container.get(OrganizationMeasurementDayRepository);
        networkMeasurementDayRepository = container.get(NetworkMeasurementDayRepository);
        networkMeasurementMonthRepository = container.get(NetworkMeasurementMonthRepository);
        crawlResultProcessor = container.get(CrawlResultProcessor);
        crawlV2Service =  container.get(CrawlV2Service);
        nodeMeasurementV2Repository = container.get(NodeMeasurementV2Repository);
        networkMeasurementRepository = container.get('Repository<NetworkMeasurement>');
        nodeMeasurementsService = container.get(NodeMeasurementService);

    });

    afterEach(async () => {
        await container.get(Connection).close();
    });

    test('processCrawlWithoutOrganizations', async () => {
        /**
         * First crawl for node
         */
        let crawl = new CrawlV2();
        node.dateDiscovered = crawl.time;
        node.dateUpdated = crawl.time;
        node.geoData.dateUpdated = crawl.time;
        node2.dateDiscovered = crawl.time;
        node2.dateUpdated = crawl.time;
        node2.geoData.dateUpdated = crawl.time;
        await crawlResultProcessor.processCrawl(crawl, [node, node2], []);

        let snapShots = await nodeSnapShotRepository.findActive();
        expect(snapShots).toHaveLength(2);
        let nodeSnapShot = snapShots.find(nodeSnapShot => nodeSnapShot.ip === node.ip)!;
        expect(nodeSnapShot.endDate).toEqual(NodeSnapShot.MAX_DATE);
        expect(nodeSnapShot.geoData).toEqual(null);
        expect(nodeSnapShot.ip).toEqual(node.ip);
        expect(nodeSnapShot.port).toEqual(node.port);
        expect(nodeSnapShot.nodeDetails).toBeDefined();
        expect(nodeSnapShot.nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(nodeSnapShot.nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(nodeSnapShot.quorumSet).toBeNull();
        expect(nodeSnapShot.organizationIdStorage).toBeNull(); //not yet loaded from database
        expect(nodeSnapShot.nodePublicKey.publicKey).toEqual(node.publicKey);
        expect(nodeSnapShot.nodePublicKey.dateDiscovered).toEqual(crawl.time);
        expect(await nodeSnapShot.startDate).toEqual(crawl.time);

        let retrievedNodes = await crawlV2Service.getNodes(crawl.time);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node.publicKey)).toEqual(node);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node2.publicKey)).toEqual(node2);

        /**
         * Second crawl with equal node
         */
        crawl = new CrawlV2();
        node.dateUpdated = crawl.time;
        node.geoData.dateUpdated = crawl.time;
        node2.dateUpdated = crawl.time;
        node2.geoData.dateUpdated = crawl.time;
        await crawlResultProcessor.processCrawl(crawl, [node, node2], []);
        snapShots = await nodeSnapShotRepository.findActive();
        let allSnapShots = await nodeSnapShotRepository.find();
        expect(snapShots).toHaveLength(2);
        expect(allSnapShots).toHaveLength(2);
        retrievedNodes = await crawlV2Service.getNodes(crawl.time);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node.publicKey)).toEqual(node);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node2.publicKey)).toEqual(node2);

        /**
         * third crawl with new geo data for node
         */
        let latestCrawl = new CrawlV2();

        node.dateUpdated = latestCrawl.time;
        node.geoData.dateUpdated = latestCrawl.time;
        node2.dateUpdated = latestCrawl.time;
        node2.geoData.dateUpdated = latestCrawl.time;

        node.geoData.latitude = 20.815460205078125;
        node.geoData.longitude = 0;

        node.geoData.countryCode = 'US';
        node.geoData.countryName = 'United States';

        latestCrawl = await crawlResultProcessor.processCrawl(latestCrawl, [node, node2], []);
        snapShots = await nodeSnapShotRepository.findActive();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(3);
        expect(allSnapShots[2].endDate).toEqual(NodeSnapShot.MAX_DATE);
        expect(allSnapShots.filter(snapShot => snapShot.isActive())).toHaveLength(2);

        expect(snapShots).toHaveLength(2);
        nodeSnapShot = snapShots.find(nodeSnapShot => nodeSnapShot.ip === node.ip)!;
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
        expect(nodeSnapShot.startDate).toEqual(latestCrawl.time);
        retrievedNodes = await crawlV2Service.getNodes(latestCrawl.time);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node.publicKey)).toEqual(node);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node2.publicKey)).toEqual(node2);
        /**
         * fourth crawl with quorumset data for node 1
         */
        latestCrawl = new CrawlV2();

        node.dateUpdated = latestCrawl.time;
        node.geoData.dateUpdated = latestCrawl.time;
        node2.dateUpdated = latestCrawl.time;
        node2.geoData.dateUpdated = latestCrawl.time;
        node.quorumSet.threshold = 2;
        node.quorumSet.validators.push(...[node.publicKey, node2.publicKey]);
        node.quorumSet.hashKey = 'IfIhR7AFvJ2YCS50O6blib1+gEaP87IwuTRgv/HEbbg=';

        latestCrawl = await crawlResultProcessor.processCrawl(latestCrawl, [node, node2], []);
        snapShots = await nodeSnapShotRepository.findActive();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(4);
        expect(allSnapShots[allSnapShots.length - 1].endDate).toEqual(NodeSnapShot.MAX_DATE);
        expect(allSnapShots.filter(snapShot => snapShot.isActive())).toHaveLength(2);

        expect(snapShots).toHaveLength(2);
        nodeSnapShot = snapShots.find(nodeSnapShot => nodeSnapShot.ip === node.ip)!;

        expect(nodeSnapShot.endDate).toEqual(NodeSnapShot.MAX_DATE);

        expect(nodeSnapShot.ip).toEqual(node.ip);
        expect(nodeSnapShot.port).toEqual(node.port);
        expect(nodeSnapShot.nodeDetails).toBeDefined();
        expect(nodeSnapShot.nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(nodeSnapShot.quorumSet).toBeDefined();
        expect(nodeSnapShot.quorumSet!.hash).toEqual(node.quorumSet.hashKey);
        expect(nodeSnapShot.quorumSet!.quorumSet).toEqual(node.quorumSet);
        expect(nodeSnapShot.organizationIdStorage).toBeNull();
        expect(nodeSnapShot.nodePublicKey.publicKey).toEqual(node.publicKey);
        expect(nodeSnapShot.startDate).toEqual(latestCrawl.time);
        retrievedNodes = await crawlV2Service.getNodes(latestCrawl.time);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node.publicKey)).toEqual(node);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node2.publicKey)).toEqual(node2);
        /**
         * Fifth crawl with new node details for node
         */
        node.historyUrl = 'https://my-history.com';
        latestCrawl = new CrawlV2();
        node.dateUpdated = latestCrawl.time;
        node.geoData.dateUpdated = latestCrawl.time;
        node2.dateUpdated = latestCrawl.time;
        node2.geoData.dateUpdated = latestCrawl.time;
        latestCrawl = await crawlResultProcessor.processCrawl(latestCrawl, [node, node2], []);
        snapShots = await nodeSnapShotRepository.findActive();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(5);
        expect(allSnapShots[allSnapShots.length - 1].endDate).toEqual(NodeSnapShot.MAX_DATE);
        expect(allSnapShots.filter(snapShot => snapShot.isActive())).toHaveLength(2);
        nodeSnapShot = snapShots.find(nodeSnapShot => nodeSnapShot.ip === node.ip)!;

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
        expect(nodeSnapShot.quorumSet!.hash).toEqual(node.quorumSet.hashKey);
        expect(nodeSnapShot.quorumSet!.quorumSet).toEqual(node.quorumSet);
        expect(nodeSnapShot.organizationIdStorage).toBeNull();
        expect(nodeSnapShot.nodePublicKey.publicKey).toEqual(node.publicKey);
        expect(nodeSnapShot.startDate).toEqual(latestCrawl.time);
        retrievedNodes = await crawlV2Service.getNodes(latestCrawl.time);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node.publicKey)).toEqual(node);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node2.publicKey)).toEqual(node2);
        /**
         * Sixth crawl: Node not crawled, it is archived
         */
        crawl = new CrawlV2();
        node.dateUpdated = crawl.time;
        node.geoData.dateUpdated = crawl.time;
        await crawlResultProcessor.processCrawl(crawl,[node], []);
        snapShots = await nodeSnapShotRepository.findActive();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(5);
        expect(allSnapShots.filter(snapShot => snapShot.isActive())).toHaveLength(1);

        expect(snapShots).toHaveLength(1);

        expect(await geoDataRepository.find()).toHaveLength(1);
        expect(await quorumSetRepository.find()).toHaveLength(2);
        retrievedNodes = await crawlV2Service.getNodes(crawl.time);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node.publicKey)).toEqual(node);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node2.publicKey)).toEqual(undefined);

        /**
         * Seventh crawl: Rediscover node, but not saved, because the node is switching public keys too much (only once per day allowed)
         */
        latestCrawl = new CrawlV2();
        node.dateUpdated = latestCrawl.time;
        node.geoData.dateUpdated = latestCrawl.time;
        node2.dateUpdated = latestCrawl.time;
        node2.geoData.dateUpdated = latestCrawl.time;
        await crawlResultProcessor.processCrawl(latestCrawl, [node, node2], []);
        snapShots = await nodeSnapShotRepository.findActive();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(5);
        expect(allSnapShots.filter(snapShot => snapShot.isActive())).toHaveLength(1);
        expect(snapShots).toHaveLength(1);

        expect(await geoDataRepository.find()).toHaveLength(1); //check if the lat/long storage doesn't trigger a change
        expect(await quorumSetRepository.find()).toHaveLength(2);
        retrievedNodes = await crawlV2Service.getNodes(latestCrawl.time);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node.publicKey)).toEqual(node);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node2.publicKey)).toEqual(undefined);
        /**
         * 8th crawl: Node SnapShot not found because it is archived. New SnapShot is made with previous publicKeyStorage entity
         */
        node2.active = true;
        node2.isValidating = true;

        let tomorrow = new Date(new Date().getTime() + 24*60*60*1000);

        latestCrawl = new CrawlV2(tomorrow);
        node.dateUpdated = latestCrawl.time;
        node.geoData.dateUpdated = latestCrawl.time;
        node2.dateUpdated = latestCrawl.time;
        node2.geoData.dateUpdated = latestCrawl.time;
        await crawlResultProcessor.processCrawl(latestCrawl, [node, node2], []);
        snapShots = await nodeSnapShotRepository.findActive();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(6);
        expect(allSnapShots.filter(snapShot => snapShot.isActive())).toHaveLength(2);

        expect(snapShots).toHaveLength(2);

        expect(await geoDataRepository.find()).toHaveLength(1);
        expect(await quorumSetRepository.find()).toHaveLength(3);
        retrievedNodes = await crawlV2Service.getNodes(latestCrawl.time);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node.publicKey)).toEqual(node);
        expect(retrievedNodes.find(retrievedNode => retrievedNode.publicKey === node2.publicKey)).toEqual(node2);

        /**
         * 9th crawl: Ip change
         */
        node.ip = 'otherLocalhost';

        await crawlResultProcessor.processCrawl(new CrawlV2(),[node, node2], []);
        snapShots = await nodeSnapShotRepository.findActive();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(7);
        expect(allSnapShots.filter(snapShot => snapShot.isActive())).toHaveLength(2);
        expect(snapShots).toHaveLength(2);

        expect(await geoDataRepository.find()).toHaveLength(1);
        expect(await quorumSetRepository.find()).toHaveLength(3);

        /**
         * 10th crawl: Ip change within the same day shouldn't trigger a new snapshot
         */
        node.ip = 'yetAnotherLocalhost';

        await crawlResultProcessor.processCrawl(new CrawlV2(), [node, node2], []);
        snapShots = await nodeSnapShotRepository.findActive();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(7);
        expect(allSnapShots.filter(snapShot => snapShot.isActive())).toHaveLength(2);
        expect(snapShots).toHaveLength(2);

        expect(await geoDataRepository.find()).toHaveLength(1);
        expect(await quorumSetRepository.find()).toHaveLength(3);

        /**
         * Check node measurements
         */
        let nodeMeasurements = await nodeMeasurementV2Repository.find();
        expect(nodeMeasurements.length).toEqual(18);
        expect(nodeMeasurements[0].index).toEqual(95);
        expect(nodeMeasurements[0].isActive).toEqual(node.active);
        expect(nodeMeasurements[0].isValidating).toEqual(node.isValidating);
        expect(nodeMeasurements[0].isFullValidator).toEqual(node.isFullValidator);
        expect(nodeMeasurements[0].isOverLoaded).toEqual(node.overLoaded);
        expect(nodeMeasurements[0].nodePublicKeyStorage).toEqual(nodeSnapShot.nodePublicKey);

        let nodePublicKeyStorageRepository:NodePublicKeyStorageRepository = container.get('NodePublicKeyStorageRepository');
        let nodePublicKeyStorage = await nodePublicKeyStorageRepository.findOne(
            {
                where: {
                    publicKey: node.publicKey
                }
            }
        );
        /**
         * check node day measurements (rollup)
         */
        let nodeMeasurementsDayV2 = await nodeMeasurementDayV2Repository.find({
            where: {
                     nodePublicKeyStorage: nodePublicKeyStorage
            }
        });

        let thirtyDaysAgo = moment(crawl.time).subtract(29, 'd').toDate();
        let nodeDayMeasurement = await nodeMeasurementsService.getNodeDayMeasurements(node.publicKey!, thirtyDaysAgo, crawl.time);
        expect(nodeDayMeasurement).toHaveLength(30);
        let todayStats = nodeDayMeasurement.find(stat => {
            return stat.day.getDate() === crawl.time.getDate() && stat.day.getMonth() === crawl.time.getMonth()
        });
        expect(todayStats!.crawlCount).toEqual(9);
        expect(todayStats!.isActiveCount).toEqual(9);
        expect(todayStats!.isValidatingCount).toEqual(9);
        expect(todayStats!.isFullValidatorCount).toEqual(9);
        expect(todayStats!.isOverloadedCount).toEqual(0);
        expect(todayStats!.indexSum).toEqual(855);

        expect(nodeMeasurementsDayV2).toHaveLength(2);
        let dayMeasurementsToday = nodeMeasurementsDayV2.find(
            dayMeasurement => dayMeasurement.day.getDate() === new Date().getDate()
        )!;
        expect(dayMeasurementsToday.crawlCount).toEqual(9);
        expect(dayMeasurementsToday.isActiveCount).toEqual(9);
        expect(dayMeasurementsToday.isValidatingCount).toEqual(9);
        expect(dayMeasurementsToday.isFullValidatorCount).toEqual(9);
        expect(dayMeasurementsToday.isOverloadedCount).toEqual(0);
        expect(dayMeasurementsToday.indexSum).toEqual(855);

        /**
         * check network measurements
         */
        let networkMeasurements = await networkMeasurementRepository.find();
        expect(networkMeasurements).toHaveLength(10);

        /**
         * check network day measurements (rollup)
         */
        let networkMeasurementsDay = await networkMeasurementDayRepository.find();

        expect(networkMeasurementsDay).toHaveLength(2);
        let networkMeasurementDay = networkMeasurementsDay.find(
            dayMeasurement => dayMeasurement.day.getDay() === new Date().getDay()
        )!;
        expect(networkMeasurementDay.hasQuorumIntersectionCount).toEqual(9);
        expect(networkMeasurementDay.hasQuorumIntersectionFilteredCount).toEqual(9);
        expect(networkMeasurementDay.crawlCount).toEqual(9);
        expect(networkMeasurementDay.nrOfActiveWatchersSum).toEqual(0);
        expect(networkMeasurementDay.nrOfActiveValidatorsSum).toEqual(8);
        expect(networkMeasurementDay.nrOfActiveFullValidatorsSum).toEqual(4);
        expect(networkMeasurementDay.nrOfActiveOrganizationsSum).toEqual(0);
        expect(networkMeasurementDay.transitiveQuorumSetSizeSum).toEqual(8);

        /**
         * check network month measurements (rollup)
         */
        let networkMeasurementsMonth = await networkMeasurementMonthRepository.find();
        expect(networkMeasurementsMonth).toHaveLength(1);
        let networkMeasurementMonth = networkMeasurementsMonth[0];
        expect(networkMeasurementMonth.hasQuorumIntersectionCount).toEqual(10);
        expect(networkMeasurementMonth.hasQuorumIntersectionFilteredCount).toEqual(10);
        expect(networkMeasurementMonth.crawlCount).toEqual(10);
        expect(networkMeasurementMonth.nrOfActiveWatchersSum).toEqual(0);
        expect(networkMeasurementMonth.nrOfActiveValidatorsSum).toEqual(10);
        expect(networkMeasurementMonth.nrOfActiveFullValidatorsSum).toEqual(5);
        expect(networkMeasurementMonth.nrOfActiveOrganizationsSum).toEqual(0);
        expect(networkMeasurementMonth.transitiveQuorumSetSizeSum).toEqual(10);

    });

    test('processCrawlWithOrganizations', async () => {
        let myOrganization = new Organization('orgId', 'My Organization');
        node.organizationId = myOrganization.id;
        node2.organizationId = myOrganization.id;
        myOrganization.validators.push(node.publicKey!);
        myOrganization.validators.push(node2.publicKey!);
        myOrganization.has30DayStats = false;
        myOrganization.github = 'git';
        myOrganization.subQuorumAvailable = true;
        myOrganization.subQuorum24HoursAvailability = 100;


        /**
         * First crawl
         */
        let crawl = new CrawlV2();
        myOrganization.dateDiscovered = crawl.time;
            await crawlResultProcessor.processCrawl(crawl,[node, node2], [myOrganization]);
        let activeNodeSnapShots = await nodeSnapShotRepository.findActive();
        let activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();
        let allOrganizationSnapShots = await organizationSnapShotRepository.find();

        expect(activeOrganizationSnapShots).toHaveLength(1);
        expect(allOrganizationSnapShots).toHaveLength(1);
        expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
        expect(activeOrganizationSnapShots[0].organizationIdStorage.organizationId).toEqual(myOrganization.id);
        expect(await organizationIdStorageRepository.find()).toHaveLength(1);
        expect(activeNodeSnapShots.filter(
            nodeSnapShot => nodeSnapShot.organizationIdStorage!.organizationId === myOrganization.id)).toHaveLength(2);
        expect(await crawlV2Service.getOrganizations(crawl.time)).toEqual([myOrganization]);

        /**
         * Second crawl, nothing changed
         */
        await crawlResultProcessor.processCrawl(new CrawlV2(),[node, node2], [myOrganization]);
        activeNodeSnapShots = await nodeSnapShotRepository.findActive();
        activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();
        allOrganizationSnapShots = await organizationSnapShotRepository.find();

        expect(activeOrganizationSnapShots).toHaveLength(1);
        expect(allOrganizationSnapShots).toHaveLength(1);
        expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
        expect(activeOrganizationSnapShots[0].organizationIdStorage.organizationId).toEqual(myOrganization.id);
        expect(await organizationIdStorageRepository.find()).toHaveLength(1);
        expect(activeNodeSnapShots.filter(
            nodeSnapShot => nodeSnapShot.organizationIdStorage!.organizationId === myOrganization.id)).toHaveLength(2);
        expect(await crawlV2Service.getOrganizations(crawl.time)).toEqual([myOrganization]);

        /**
         * third crawl, description changed
         */
        myOrganization.description = 'this is a new description';
        crawl = await crawlResultProcessor.processCrawl(new CrawlV2(),[node, node2], [myOrganization]);
        activeNodeSnapShots = await nodeSnapShotRepository.findActive();
        activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();
        let activeSnapShot = activeOrganizationSnapShots[0];
        allOrganizationSnapShots = await organizationSnapShotRepository.find();

        expect(activeOrganizationSnapShots).toHaveLength(1);
        expect(allOrganizationSnapShots).toHaveLength(2);
        expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
        expect(activeOrganizationSnapShots[0].description).toEqual(myOrganization.description);
        expect(activeOrganizationSnapShots[0].organizationIdStorage.organizationId).toEqual(myOrganization.id);
        expect(await organizationIdStorageRepository.find()).toHaveLength(1);
        expect(activeNodeSnapShots.filter(
            nodeSnapShot => nodeSnapShot.organizationIdStorage!.organizationId === myOrganization.id)).toHaveLength(2);
        expect(activeOrganizationSnapShots[0].validators.map(validator => validator.publicKey)).toEqual([node.publicKey, node2.publicKey]);
        expect(await crawlV2Service.getOrganizations(crawl.time)).toEqual([myOrganization]);

        /**
         * organization archived in snapshots. Rediscovery should trigger a new snapshot
         */
        myOrganization.description = 'this is a new description';
        activeSnapShot.endDate = crawl.time;
        await organizationSnapShotRepository.save(activeSnapShot);
        await crawlResultProcessor.processCrawl(new CrawlV2(),[node, node2], [myOrganization]);
        activeNodeSnapShots = await nodeSnapShotRepository.findActive();
        activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();
        allOrganizationSnapShots = await organizationSnapShotRepository.find();

        expect(activeOrganizationSnapShots).toHaveLength(1);
        expect(allOrganizationSnapShots).toHaveLength(3);
        expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
        expect(activeOrganizationSnapShots[0].description).toEqual(myOrganization.description);
        expect(activeOrganizationSnapShots[0].organizationIdStorage.organizationId).toEqual(myOrganization.id);
        expect(await organizationIdStorageRepository.find()).toHaveLength(1);
        expect(activeNodeSnapShots.filter(
            nodeSnapShot => nodeSnapShot.organizationIdStorage!.organizationId === myOrganization.id)).toHaveLength(2);
        expect(activeOrganizationSnapShots[0].validators.map(validator => validator.publicKey)).toEqual([node.publicKey, node2.publicKey]);


        /**
         * Nodes change organization
         */
        let myNewOrganization = new Organization('anotherId', 'My new Organization');
        node.organizationId = myNewOrganization.id;
        node2.organizationId = myNewOrganization.id;
        myNewOrganization.validators.push(node.publicKey!);
        myNewOrganization.validators.push(node2.publicKey!);
        myOrganization.validators = [];
        await crawlResultProcessor.processCrawl(new CrawlV2(),[node, node2], [myOrganization, myNewOrganization]);

        activeNodeSnapShots = await nodeSnapShotRepository.findActive();
        activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();
        allOrganizationSnapShots = await organizationSnapShotRepository.find();

        expect(activeOrganizationSnapShots).toHaveLength(2); //old organization is not archived
        expect(allOrganizationSnapShots).toHaveLength(5);
        expect(await organizationIdStorageRepository.find()).toHaveLength(2);
        expect(activeNodeSnapShots.filter(
            nodeSnapShot => nodeSnapShot.organizationIdStorage!.organizationId === myNewOrganization.id)).toHaveLength(2);
        expect(activeOrganizationSnapShots.find(org => org.organizationIdStorage.organizationId === myNewOrganization.id)!.validators.map(validator => validator.publicKey)).toEqual([node.publicKey, node2.publicKey]);

        /**
         * check organization day measurements (rollup)
         */
        let organizationIdStorage = await organizationIdStorageRepository.findOne(
            {
                where: {
                    organizationId: myOrganization.id
                }
            }
        );

        let organizationMeasurementsDay = await organizationMeasurementDayRepository.find({
            where: {
                organizationIdStorage: organizationIdStorage
            }
        });

        expect(organizationMeasurementsDay).toHaveLength(1);
        expect(organizationMeasurementsDay[0].crawlCount).toEqual(5);
        expect(organizationMeasurementsDay[0].isSubQuorumAvailableCount).toEqual(5);
        expect(organizationMeasurementsDay[0].indexSum).toEqual(0);

    });


    test('organization measurements and subquorum Availability', async () => {
        let myOrganization = new Organization('orgId', 'My Organization');
        myOrganization.validators.push(node.publicKey!);
        myOrganization.validators.push(node2.publicKey!);
        node.organizationId = myOrganization.id;
        node2.organizationId = myOrganization.id;
        node.isValidating = true;
        node2.isValidating = false;

        await crawlResultProcessor.processCrawl(new CrawlV2(),[node, node2], [myOrganization]);
        let organizationMeasurements = await organizationMeasurementRepository.find();
        expect(organizationMeasurements).toHaveLength(1);
        expect(organizationMeasurements.filter(
            organizationMeasurement => organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(1);
        expect(organizationMeasurements.filter(
            organizationMeasurement => !organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(0);
        expect(organizationMeasurements[0]!.index).toEqual(0);

        node.isValidating = false;
        await crawlResultProcessor.processCrawl(new CrawlV2(),[node, node2], [myOrganization]);
        organizationMeasurements = await organizationMeasurementRepository.find();
        expect(organizationMeasurements).toHaveLength(2);
        expect(organizationMeasurements.filter(
            organizationMeasurement => organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(1);
        expect(organizationMeasurements.filter(
            organizationMeasurement => !organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(1);

        /**
         * organization not crawled, it is archived
         */
        node.isValidating = true;
        await crawlResultProcessor.processCrawl(new CrawlV2(),[node, node2], []);
        organizationMeasurements = await organizationMeasurementRepository.find();
        expect(organizationMeasurements).toHaveLength(2);
        expect(organizationMeasurements.filter(
            organizationMeasurement => organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(1);
        expect(organizationMeasurements.filter(
            organizationMeasurement => !organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(1);
    });

    /*test('Archiving', async () => {
        let myOrganization = new Organization('orgId', 'My Organization');
        myOrganization.validators.push(node.publicKey!);
        myOrganization.validators.push(node2.publicKey!);
        node.active = false;
        node2.active = false;
        await crawlResultProcessor.processCrawl(new CrawlV2(new Date(1999,11,1)),[node, node2], [myOrganization], []);
        let activeNodeSnapShots = await nodeSnapShotRepository.findActive();
        let activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();

        expect(activeNodeSnapShots).toHaveLength(0);
        expect(activeOrganizationSnapShots).toHaveLength(1);

        /*
        Organization is archived in next run.
         */
    /*
        await crawlResultProcessor.processCrawl(new CrawlV2(new Date(1999,11,2)),[], [myOrganization], []);
        activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();
        expect(activeOrganizationSnapShots).toHaveLength(0);

        node.active = true;
        node2.active = true;
        node.quorumSet.validators = [];
        node2.quorumSet.validators = [];
        await crawlResultProcessor.processCrawl(new CrawlV2(),[node, node2], [myOrganization], []);
        activeNodeSnapShots = await nodeSnapShotRepository.findActive();

        expect(activeNodeSnapShots.filter(activeNodeSnapShot => activeNodeSnapShot.quorumSet === null)).toHaveLength(2);

    });*/
});