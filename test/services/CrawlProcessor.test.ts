import {Connection, createConnection, getCustomRepository, getRepository, Repository} from "typeorm";

import SnapShotService from "../../src/services/SnapShotService";
import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../../src/factory/NodeSnapShotFactory";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import NodeGeoDataStorage from "../../src/entities/NodeGeoDataStorage";
import NodeQuorumSetStorage from "../../src/entities/NodeQuorumSetStorage";
import {CrawlResultProcessor} from "../../src/services/CrawlResultProcessor";
import {CrawlV2Repository} from "../../src/repositories/CrawlV2Repository";
import NodeMeasurementV2 from "../../src/entities/NodeMeasurementV2";
import OrganizationIdStorage from "../../src/entities/OrganizationIdStorage";
import OrganizationSnapShotFactory from "../../src/factory/OrganizationSnapShotFactory";
import OrganizationSnapShotRepository from "../../src/repositories/OrganizationSnapShotRepository";
import NodePublicKeyStorage from "../../src/entities/NodePublicKeyStorage";
import OrganizationMeasurement from "../../src/entities/OrganizationMeasurement";

describe("multiple crawls", () => {
    jest.setTimeout(60000); //slow and long integration test
    let connection: Connection;
    let node: Node;
    let node2: Node;
    let geoDataRepository: Repository<NodeGeoDataStorage>;
    let quorumSetRepository: Repository<NodeQuorumSetStorage>;
    let crawlResultProcessor: CrawlResultProcessor;
    let snapShotService: SnapShotService;
    let nodeSnapShotRepository: NodeSnapShotRepository;
    let organizationSnapShotRepository: OrganizationSnapShotRepository;
    let organizationIdStorageRepository: Repository<OrganizationIdStorage>;

    beforeEach(async () => {
        connection = await createConnection('test');
        node = new Node('localhost');
        node.publicKey = 'A';
        node.versionStr = 'v1';
        node.active = true;
        node.isFullValidator = true;
        node.index = 1;
        node.isValidating = true;
        node.overLoaded = true;
        node2 = new Node('otherHost');
        node2.publicKey = 'B';
        node2.versionStr = 'v1';
        node2.active = true;
        node2.isFullValidator = false;
        node2.index = 1;
        node2.isValidating = false;
        node2.overLoaded = true;
        nodeSnapShotRepository = getCustomRepository(NodeSnapShotRepository, 'test');
        geoDataRepository = getRepository(NodeGeoDataStorage, 'test');
        quorumSetRepository = getRepository(NodeQuorumSetStorage, 'test');
        let crawlV2Repository = getCustomRepository(CrawlV2Repository, 'test');
        organizationSnapShotRepository = getCustomRepository(OrganizationSnapShotRepository, 'test');
        organizationIdStorageRepository = getRepository(OrganizationIdStorage, 'test');
        let nodePublicKeyStorageRepository = getRepository(NodePublicKeyStorage, 'test');
        snapShotService = new SnapShotService(
            nodeSnapShotRepository,
            new NodeSnapShotFactory(),
            nodePublicKeyStorageRepository,
            organizationSnapShotRepository,
            organizationIdStorageRepository,
            new OrganizationSnapShotFactory()
        );
        crawlResultProcessor = new CrawlResultProcessor(crawlV2Repository, snapShotService, connection);
    });

    afterEach(async () => {
        await connection.close();
    });

    test('processCrawlWithoutOrganizations', async () => {
        /**
         * First crawl for node
         */
        let crawl = await crawlResultProcessor.processCrawl([node, node2], [], []);

        let snapShots = await snapShotService.getActiveNodeSnapShots();
        expect(snapShots).toHaveLength(2);
        expect(snapShots[0].endCrawl).toEqual(null);
        expect(snapShots[0].geoData).toEqual(null);
        expect(snapShots[0].ip).toEqual(node.ip);
        expect(snapShots[0].port).toEqual(node.port);
        expect(snapShots[0].nodeDetails).toBeDefined();
        expect(snapShots[0].nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(snapShots[0].nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(snapShots[0].quorumSet).toBeNull();
        expect(snapShots[0].organizationIdStorage).toBeNull(); //not yet loaded from database
        expect(snapShots[0].nodePublicKey.publicKey).toEqual(node.publicKey);
        expect(snapShots[0].nodePublicKey.dateDiscovered).toEqual(crawl.validFrom);
        expect(await snapShots[0].startCrawl).toEqual(crawl);

        /**
         * Second crawl with equal node
         */
        await crawlResultProcessor.processCrawl([node, node2], [], []);
        snapShots = await snapShotService.getActiveNodeSnapShots();
        let allSnapShots = await nodeSnapShotRepository.find();
        expect(snapShots).toHaveLength(2);
        expect(allSnapShots).toHaveLength(2);

        /**
         * third crawl with new geo data for node
         */
        node.geoData.latitude = 20.815460205078125;
        node.geoData.longitude = -70.07540893554688;

        node.geoData.countryCode = 'US';
        node.geoData.countryName = 'United States';

        let latestCrawl = await crawlResultProcessor.processCrawl([node, node2], [], []);
        snapShots = await snapShotService.getActiveNodeSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(3);
        expect(allSnapShots[2].endCrawl).toEqual(null);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(2);

        expect(snapShots).toHaveLength(2);
        expect(snapShots[0].endCrawl).toEqual(null);
        expect(snapShots[0].geoData).toBeDefined();
        expect(snapShots[0].geoData!.countryCode).toEqual(node.geoData.countryCode);
        expect(snapShots[0].geoData!.countryName).toEqual(node.geoData.countryName);
        expect(snapShots[0].geoData!.longitude).toEqual(node.geoData.longitude);
        expect(snapShots[0].geoData!.latitude).toEqual(node.geoData.latitude);

        expect(snapShots[0].ip).toEqual(node.ip);
        expect(snapShots[0].port).toEqual(node.port);
        expect(snapShots[0].nodeDetails).toBeDefined();
        expect(snapShots[0].nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(snapShots[0].quorumSet).toBeNull();
        expect(snapShots[0].organizationIdStorage).toBeNull();
        expect(snapShots[0].nodePublicKey.publicKey).toEqual(node.publicKey);
        expect(snapShots[0].nodePublicKey.dateDiscovered).toEqual(crawl.validFrom);
        expect(snapShots[0].startCrawl).toEqual(latestCrawl);

        /**
         * fourth crawl with quorumset data for node
         */
        node.quorumSet.threshold = 2;
        node.quorumSet.validators.push(...['a', 'b']);
        node.quorumSet.hashKey = 'IfIhR7AFvJ2YCS50O6blib1+gEaP87IwuTRgv/HEbbg=';

        latestCrawl = await crawlResultProcessor.processCrawl([node, node2], [], []);
        snapShots = await snapShotService.getActiveNodeSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(4);
        expect(allSnapShots[allSnapShots.length - 1].endCrawl).toEqual(null);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(2);

        expect(snapShots).toHaveLength(2);
        expect(snapShots[0].endCrawl).toEqual(null);
        expect(snapShots[0].geoData).toBeDefined();
        expect(snapShots[0].geoData!.countryCode).toEqual(node.geoData.countryCode);
        expect(snapShots[0].geoData!.countryName).toEqual(node.geoData.countryName);
        expect(snapShots[0].geoData!.longitude).toEqual(node.geoData.longitude);
        expect(snapShots[0].geoData!.latitude).toEqual(node.geoData.latitude);
        expect(await geoDataRepository.find()).toHaveLength(1); //check if the lat/long storage doesn't trigger a change

        expect(snapShots[0].ip).toEqual(node.ip);
        expect(snapShots[0].port).toEqual(node.port);
        expect(snapShots[0].nodeDetails).toBeDefined();
        expect(snapShots[0].nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(snapShots[0].quorumSet).toBeDefined();
        expect(snapShots[0].quorumSet!.hash).toEqual(node.quorumSet.hashKey);
        expect(snapShots[0].quorumSet!.quorumSet).toEqual(node.quorumSet);
        expect(snapShots[0].organizationIdStorage).toBeNull();
        expect(snapShots[0].nodePublicKey.publicKey).toEqual(node.publicKey);
        expect(snapShots[0].nodePublicKey.dateDiscovered).toEqual(crawl.validFrom);
        expect(snapShots[0].startCrawl).toEqual(latestCrawl);

        /**
         * Fifth crawl with new node details for node
         */
        node.historyUrl = 'https://my-history.com';

        latestCrawl = await crawlResultProcessor.processCrawl([node, node2], [], []);
        snapShots = await snapShotService.getActiveNodeSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(5);
        expect(allSnapShots[allSnapShots.length - 1].endCrawl).toEqual(null);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(2);

        expect(snapShots).toHaveLength(2);
        expect(snapShots[0].endCrawl).toEqual(null);
        expect(snapShots[0].geoData).toBeDefined();
        expect(snapShots[0].geoData!.countryCode).toEqual(node.geoData.countryCode);
        expect(snapShots[0].geoData!.countryName).toEqual(node.geoData.countryName);
        expect(snapShots[0].geoData!.longitude).toEqual(node.geoData.longitude);
        expect(snapShots[0].geoData!.latitude).toEqual(node.geoData.latitude);
        expect(await geoDataRepository.find()).toHaveLength(1); //check if the lat/long storage doesn't trigger a change
        expect(await quorumSetRepository.find()).toHaveLength(1);

        expect(snapShots[0].ip).toEqual(node.ip);
        expect(snapShots[0].port).toEqual(node.port);
        expect(snapShots[0].nodeDetails).toBeDefined();
        expect(snapShots[0].nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(snapShots[0].nodeDetails!.historyUrl).toEqual(node.historyUrl);
        expect(snapShots[0].quorumSet).toBeDefined();
        expect(snapShots[0].quorumSet!.hash).toEqual(node.quorumSet.hashKey);
        expect(snapShots[0].quorumSet!.quorumSet).toEqual(node.quorumSet);
        expect(snapShots[0].organizationIdStorage).toBeNull();
        expect(snapShots[0].nodePublicKey.publicKey).toEqual(node.publicKey);
        expect(snapShots[0].nodePublicKey.dateDiscovered).toEqual(crawl.validFrom);
        expect(snapShots[0].startCrawl).toEqual(latestCrawl);

        /**
         * Sixth crawl: Node not crawled, but not yet archived
         */
        let previousSnapShot = snapShots[0];
        await crawlResultProcessor.processCrawl([node2], [], []);
        snapShots = await snapShotService.getActiveNodeSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(5);
        expect(allSnapShots[allSnapShots.length - 1].endCrawl).toEqual(null);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(2);

        expect(snapShots).toHaveLength(2);
        expect(snapShots[0]).toEqual(previousSnapShot);

        expect(await geoDataRepository.find()).toHaveLength(1);
        expect(await quorumSetRepository.find()).toHaveLength(1);

        /**
         * Seventh crawl: Rediscover node
         */
        latestCrawl = await crawlResultProcessor.processCrawl([node, node2], [], []);
        snapShots = await snapShotService.getActiveNodeSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(5);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(2);
        expect(snapShots[0]).toEqual(previousSnapShot);
        expect(snapShots).toHaveLength(2);

        expect(await geoDataRepository.find()).toHaveLength(1); //check if the lat/long storage doesn't trigger a change
        expect(await quorumSetRepository.find()).toHaveLength(1);

        /**
         * 8th crawl: Node SnapShot not found because it is archived. New SnapShot is made with previous publicKeyStorage entity
         */
        //archive node
        previousSnapShot = snapShots[0];
        previousSnapShot.endCrawl = latestCrawl;
        await nodeSnapShotRepository.save(previousSnapShot);

        await crawlResultProcessor.processCrawl([node, node2], [], []);
        snapShots = await snapShotService.getActiveNodeSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(6);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(2);

        expect(previousSnapShot.endCrawl).toEqual(latestCrawl);

        expect(snapShots).toHaveLength(2);

        expect(await geoDataRepository.find()).toHaveLength(2);
        expect(await quorumSetRepository.find()).toHaveLength(2);

        /**
         * Check node measurements
         */
        let nodeMeasurements = await getRepository(NodeMeasurementV2, 'test').find();
        expect(nodeMeasurements.length).toEqual(16);
        expect(nodeMeasurements[0].index).toEqual(node.index);
        expect(nodeMeasurements[0].isActive).toEqual(node.active);
        expect(nodeMeasurements[0].isValidating).toEqual(node.isValidating);
        expect(nodeMeasurements[0].isFullValidator).toEqual(node.isFullValidator);
        expect(nodeMeasurements[0].isOverLoaded).toEqual(node.overLoaded);
        expect(nodeMeasurements[0].nodePublicKeyStorage).toEqual(snapShots[0].nodePublicKey);
    });

    test('processCrawlWithOrganizations', async () => {
        let myOrganization = new Organization('orgId', 'My Organization');
        node.organizationId = myOrganization.id;
        node2.organizationId = myOrganization.id;
        myOrganization.validators.push(node.publicKey);
        myOrganization.validators.push(node2.publicKey);

        /**
         * First crawl
         */
        await crawlResultProcessor.processCrawl([node, node2], [myOrganization], []);
        let activeNodeSnapShots = await snapShotService.getActiveNodeSnapShots();
        let activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();
        let allOrganizationSnapShots = await organizationSnapShotRepository.find();

        expect(activeOrganizationSnapShots).toHaveLength(1);
        expect(allOrganizationSnapShots).toHaveLength(1);
        expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
        expect(activeOrganizationSnapShots[0].organizationIdStorage.organizationId).toEqual(myOrganization.id);
        expect(await organizationIdStorageRepository.find()).toHaveLength(1);
        expect(activeNodeSnapShots.filter(
            nodeSnapShot => nodeSnapShot.organizationIdStorage!.organizationId === myOrganization.id)).toHaveLength(2);

        /**
         * Second crawl, nothing changed
         */
        await crawlResultProcessor.processCrawl([node, node2], [myOrganization], []);
        activeNodeSnapShots = await snapShotService.getActiveNodeSnapShots();
        activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();
        allOrganizationSnapShots = await organizationSnapShotRepository.find();

        expect(activeOrganizationSnapShots).toHaveLength(1);
        expect(allOrganizationSnapShots).toHaveLength(1);
        expect(activeOrganizationSnapShots[0].name).toEqual(myOrganization.name);
        expect(activeOrganizationSnapShots[0].organizationIdStorage.organizationId).toEqual(myOrganization.id);
        expect(await organizationIdStorageRepository.find()).toHaveLength(1);
        expect(activeNodeSnapShots.filter(
            nodeSnapShot => nodeSnapShot.organizationIdStorage!.organizationId === myOrganization.id)).toHaveLength(2);

        /**
         * third crawl, description changed
         */
        myOrganization.description = 'this is a new description';
        let crawl = await crawlResultProcessor.processCrawl([node, node2], [myOrganization], []);
        activeNodeSnapShots = await snapShotService.getActiveNodeSnapShots();
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

        /**
         * organization archived in snapshots. Rediscovery should trigger a new snapshot
         */
        myOrganization.description = 'this is a new description';
        activeSnapShot.endCrawl = crawl;
        await organizationSnapShotRepository.save(activeSnapShot);
        await crawlResultProcessor.processCrawl([node, node2], [myOrganization], []);
        activeNodeSnapShots = await snapShotService.getActiveNodeSnapShots();
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
        myNewOrganization.validators.push(node.publicKey);
        myNewOrganization.validators.push(node2.publicKey);
        myOrganization.validators = [];
        await crawlResultProcessor.processCrawl([node, node2], [myOrganization, myNewOrganization], []);

        activeNodeSnapShots = await snapShotService.getActiveNodeSnapShots();
        activeOrganizationSnapShots = await organizationSnapShotRepository.findActive();
        allOrganizationSnapShots = await organizationSnapShotRepository.find();

        expect(activeOrganizationSnapShots).toHaveLength(2);
        expect(allOrganizationSnapShots).toHaveLength(5);
        expect(await organizationIdStorageRepository.find()).toHaveLength(2);
        expect(activeNodeSnapShots.filter(
            nodeSnapShot => nodeSnapShot.organizationIdStorage!.organizationId === myNewOrganization.id)).toHaveLength(2);
        expect(activeOrganizationSnapShots.find(org => org.organizationIdStorage.organizationId === myOrganization.id)!.validators.map(validator => validator.publicKey)).toEqual([]);
        expect(activeOrganizationSnapShots.find(org => org.organizationIdStorage.organizationId === myNewOrganization.id)!.validators.map(validator => validator.publicKey)).toEqual([node.publicKey, node2.publicKey]);

    });


    test('organization measurements and subquorum Availability', async () => {
        let myOrganization = new Organization('orgId', 'My Organization');
        myOrganization.validators.push(node.publicKey);
        myOrganization.validators.push(node2.publicKey);
        node.organizationId = myOrganization.id;
        node2.organizationId = myOrganization.id;
        node.isValidating = true;
        node2.isValidating = false;

        await crawlResultProcessor.processCrawl([node, node2], [myOrganization], []);
        let organizationMeasurements = await getRepository(OrganizationMeasurement, 'test').find();
        expect(organizationMeasurements).toHaveLength(1);
        expect(organizationMeasurements.filter(
            organizationMeasurement => organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(1);
        expect(organizationMeasurements.filter(
            organizationMeasurement => !organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(0);
        expect(organizationMeasurements[0]!.index).toEqual(0);

        node.isValidating = false;
        await crawlResultProcessor.processCrawl([node, node2], [myOrganization], []);
        organizationMeasurements = await getRepository(OrganizationMeasurement, 'test').find();
        expect(organizationMeasurements).toHaveLength(2);
        expect(organizationMeasurements.filter(
            organizationMeasurement => organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(1);
        expect(organizationMeasurements.filter(
            organizationMeasurement => !organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(1);

        /**
         * organization not crawled, but not archived in snapshots. Measurement should be generated, but subquorum not available.
         */
        node.isValidating = true;
        await crawlResultProcessor.processCrawl([node, node2], [], []);
        organizationMeasurements = await getRepository(OrganizationMeasurement, 'test').find();
        expect(organizationMeasurements).toHaveLength(3);
        expect(organizationMeasurements.filter(
            organizationMeasurement => organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(1);
        expect(organizationMeasurements.filter(
            organizationMeasurement => !organizationMeasurement.isSubQuorumAvailable)
        ).toHaveLength(2);

        console.log(await snapShotService.getActiveNodeSnapShots());
    })
});