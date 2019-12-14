import {Connection, createConnection, getCustomRepository, getRepository} from "typeorm";
import NodeStorageV2Service from "../../src/services/NodeStorageV2Service";
import NodeStorageV2Repository from "../../src/repositories/NodeStorageV2Repository";
import NodeSnapShotService from "../../src/services/NodeSnapShotService";
import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../../src/factory/NodeSnapShotFactory";
import NodeStorageV2Factory from "../../src/factory/NodeStorageV2Factory";
import {Node} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../../src/entities/CrawlV2";
import GeoDataStorage from "../../src/entities/GeoDataStorage";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";

describe("update", () => {
    jest.setTimeout(60000); //slow and long integration test
    test('getSnapShotsUpdatedWithCrawl', async () => {
        let connection: Connection = await createConnection('test');
        let node = new Node('localhost');
        node.publicKey = 'A';
        node.versionStr = 'v1';
        let crawl = new CrawlV2();
        await connection.manager.save(crawl);
        let nodeSnapShotRepository = getCustomRepository(NodeSnapShotRepository, 'test');
        let geoDataRepository = getRepository(GeoDataStorage, 'test');
        let quorumSetRepository = getRepository(QuorumSetStorage, 'test');
        let nodeSnapShotService = new NodeSnapShotService(nodeSnapShotRepository, new NodeSnapShotFactory());
        let nodeStorageService = new NodeStorageV2Service(
            getCustomRepository(NodeStorageV2Repository, 'test'),
            nodeSnapShotService,
            new NodeStorageV2Factory(new NodeSnapShotFactory())
        );

        /**
         * First crawl for node
         */
        let updatedSnapShots = await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], crawl);
        await connection.manager.save(updatedSnapShots);
        let snapShots = await nodeSnapShotService.getLatestSnapShots();
        expect(snapShots).toHaveLength(1);
        expect(snapShots[0].current).toBeTruthy();
        expect(snapShots[0].endCrawl).toEqual(null);
        expect(snapShots[0].geoData).toEqual(null);
        expect(snapShots[0].ip).toEqual(node.ip);
        expect(snapShots[0].port).toEqual(node.port);
        expect(snapShots[0].nodeDetails).toBeDefined();
        expect(snapShots[0].nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(snapShots[0].nodeDetails!.versionStr).toEqual(node.versionStr);
        expect(snapShots[0].quorumSet).toBeNull();
        expect(snapShots[0].organization).toBeNull();
        expect(snapShots[0].nodeStorage.publicKey).toEqual(node.publicKey);
        expect(snapShots[0].nodeStorage.dateDiscovered).toEqual(crawl.validFrom);
        expect(await snapShots[0].startCrawl).toEqual(crawl);

        /**
         * Second crawl with equal node
         */
        let latestCrawl = new CrawlV2();
        await connection.manager.save(latestCrawl);
        updatedSnapShots = await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);
        await connection.manager.save(updatedSnapShots);await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);
        snapShots = await nodeSnapShotService.getLatestSnapShots();
        expect(snapShots).toHaveLength(1);

        /**
         * third crawl with new geo data for node
         */
        node.geoData.latitude = 20.815460205078125;
        node.geoData.longitude = -70.07540893554688;

        node.geoData.countryCode = 'US';
        node.geoData.countryName = 'United States';

        latestCrawl = new CrawlV2();
        await connection.manager.save(latestCrawl);
        updatedSnapShots = await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);
        await connection.manager.save(updatedSnapShots);await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);
        snapShots = await nodeSnapShotService.getLatestSnapShots();
        let allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(2);
        expect(allSnapShots.filter(snapShot => snapShot.current)).toHaveLength(1);
        expect(allSnapShots[1].endCrawl).toEqual(null);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(1);

        expect(snapShots).toHaveLength(1);
        expect(snapShots[0].current).toBeTruthy();
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
        expect(snapShots[0].organization).toBeNull();
        expect(snapShots[0].nodeStorage.publicKey).toEqual(node.publicKey);
        expect(snapShots[0].nodeStorage.dateDiscovered).toEqual(crawl.validFrom);
        expect(snapShots[0].startCrawl).toEqual(latestCrawl);

        /**
         * fourth crawl with quorumset data for node
         */
        node.quorumSet.threshold = 2;
        node.quorumSet.validators.push(...['a', 'b']);
        node.quorumSet.hashKey = 'IfIhR7AFvJ2YCS50O6blib1+gEaP87IwuTRgv/HEbbg=';

        latestCrawl = new CrawlV2();
        await connection.manager.save(latestCrawl);
        updatedSnapShots = await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);
        await connection.manager.save(updatedSnapShots);await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);        snapShots = await nodeSnapShotService.getLatestSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(3);
        expect(allSnapShots.filter(snapShot => snapShot.current)).toHaveLength(1);
        expect(allSnapShots[allSnapShots.length - 1].endCrawl).toEqual(null);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(1);

        expect(snapShots).toHaveLength(1);
        expect(snapShots[0].current).toBeTruthy();
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
        expect(snapShots[0].organization).toBeNull();
        expect(snapShots[0].nodeStorage.publicKey).toEqual(node.publicKey);
        expect(snapShots[0].nodeStorage.dateDiscovered).toEqual(crawl.validFrom);
        expect(snapShots[0].startCrawl).toEqual(latestCrawl);

        /**
         * Fifth crawl with new node details for node
         */
        node.historyUrl = 'https://my-history.com';

        latestCrawl = new CrawlV2();
        await connection.manager.save(latestCrawl);
        updatedSnapShots = await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);
        await connection.manager.save(updatedSnapShots);await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);        snapShots = await nodeSnapShotService.getLatestSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(4);
        expect(allSnapShots.filter(snapShot => snapShot.current)).toHaveLength(1);
        expect(allSnapShots[allSnapShots.length - 1].endCrawl).toEqual(null);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(1);

        expect(snapShots).toHaveLength(1);
        expect(snapShots[0].current).toBeTruthy();
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
        expect(snapShots[0].organization).toBeNull();
        expect(snapShots[0].nodeStorage.publicKey).toEqual(node.publicKey);
        expect(snapShots[0].nodeStorage.dateDiscovered).toEqual(crawl.validFrom);
        expect(snapShots[0].startCrawl).toEqual(latestCrawl);

        /**
         * Sixth crawl: Node not found
         */
        let previousSnapShot = snapShots[0];
        latestCrawl = new CrawlV2();
        await connection.manager.save(latestCrawl);
        updatedSnapShots = await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);
        await connection.manager.save(updatedSnapShots);await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);        snapShots = await nodeSnapShotService.getLatestSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(4);
        expect(allSnapShots.filter(snapShot => snapShot.current)).toHaveLength(1);
        expect(allSnapShots[allSnapShots.length - 1].endCrawl).toEqual(null);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(1);

        expect(snapShots).toHaveLength(1);
        expect(snapShots[0]).toEqual(previousSnapShot);

        expect(await geoDataRepository.find()).toHaveLength(1);
        expect(await quorumSetRepository.find()).toHaveLength(1);

        /**
         * Seventh crawl: Rediscover node
         */
        latestCrawl = new CrawlV2();
        await connection.manager.save(latestCrawl);
        updatedSnapShots = await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);
        await connection.manager.save(updatedSnapShots);await nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl([node], latestCrawl);        snapShots = await nodeSnapShotService.getLatestSnapShots();
        allSnapShots = await nodeSnapShotRepository.find();

        expect(allSnapShots).toHaveLength(4);
        expect(allSnapShots.filter(snapShot => snapShot.current)).toHaveLength(1);
        expect(allSnapShots[allSnapShots.length - 1].endCrawl).toEqual(null);
        expect(allSnapShots.filter(snapShot => snapShot.endCrawl === null)).toHaveLength(1);
        expect(snapShots[0]).toEqual(previousSnapShot);
        expect(snapShots).toHaveLength(1);

        expect(await geoDataRepository.find()).toHaveLength(1); //check if the lat/long storage doesn't trigger a change
        expect(await quorumSetRepository.find()).toHaveLength(1);

        await connection.close();

    });
});