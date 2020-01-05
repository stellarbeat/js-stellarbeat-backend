import {Connection, createConnection, getCustomRepository, getRepository, Repository} from "typeorm";
import TimeTravelMigration from "../entities/TimeTravelMigration";
import Crawl from "../entities/Crawl";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../factory/NodeSnapShotFactory";
import NodeStorage from "../entities/NodeStorage";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import {CrawlResultProcessor} from "../services/CrawlResultProcessor";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import OrganizationSnapShotRepository from "../repositories/OrganizationSnapShotRepository";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import OrganizationSnapShotFactory from "../factory/OrganizationSnapShotFactory";
import NodeSnapShotter from "../services/SnapShotting/NodeSnapShotter";
import * as Sentry from "@sentry/node";
import OrganizationSnapShotter from "../services/SnapShotting/OrganizationSnapShotter";
import Archiver from "../services/Archiver";
import MeasurementsRollupService from "../services/MeasurementsRollupService";
import MeasurementRollup from "../entities/MeasurementRollup";
import {NodeMeasurementDayV2Repository} from "../repositories/NodeMeasurementDayV2Repository";
import {OrganizationMeasurementDayRepository} from "../repositories/OrganizationMeasurementDayRepository";
import {NetworkMeasurementDayRepository} from "../repositories/NetworkMeasurementDayRepository";
import OrganizationStorage from "../entities/OrganizationStorage";
import CrawlV2 from "../entities/CrawlV2";

Sentry.init({dsn: process.env.SENTRY_DSN});

let isShuttingDown = false;
process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'));

let connection!: Connection;
let nodeRepo: Repository<NodeStorage>;
let organizationRepo: Repository<OrganizationStorage>;
let crawlResultProcessor: CrawlResultProcessor;

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
    connection = await createConnection();
    nodeRepo = getRepository(NodeStorage);
    organizationRepo = getRepository(OrganizationStorage);
    crawlResultProcessor = createCrawlProcessor();
    let migrationEntity = await connection.manager.findOne(TimeTravelMigration);
    if (!migrationEntity)
        migrationEntity = new TimeTravelMigration();
    console.log("last migrated crawl id: " + migrationEntity.lastMigratedCrawl);

    while(true) {
        if(isShuttingDown){
            console.time('Shutting down');
            process.exit(0);
        }
        console.time('migrate single crawl');
        await migrateCrawl(connection, migrationEntity);
        await connection.manager.save(migrationEntity);
        console.timeEnd('migrate single crawl');
    }
    await connection.close();
    //TODO: logging
}

async function migrateCrawl(connection: Connection, migrationEntity: TimeTravelMigration) {
    let crawl = await connection.manager.findOne(Crawl, migrationEntity.lastMigratedCrawl++);
    if (!crawl || !crawl.completed) {
        console.log("no valid crawl with id: " + migrationEntity.lastMigratedCrawl);
    } else {
        console.log("migrating crawl: " + crawl.time);
        let nodeEntities = await nodeRepo.find({where: {crawl: crawl}});

        let nodes = nodeEntities.map(nodeEntity => {
            return Node.fromJSON(nodeEntity.nodeJson)
        });

        nodes = removeDuplicatePublicKeys(nodes);

        let organizationEntities = await organizationRepo.find({where: {crawl: crawl}});
        let organizations = organizationEntities.map(orgEntity => Organization.fromJSON(orgEntity.organizationJson)!);
        let migratedCrawl = new CrawlV2(crawl.time, crawl.ledgers);
        await crawlResultProcessor.processCrawl(migratedCrawl, nodes, organizations, crawl.ledgers);
        console.log(migratedCrawl.id);
    }
}

function createCrawlProcessor() {
    let nodeSnapShotRepository = getCustomRepository(NodeSnapShotRepository);
    let crawlV2Repository = getCustomRepository(CrawlV2Repository);
    let organizationSnapShotRepository = getCustomRepository(OrganizationSnapShotRepository);
    let organizationIdStorageRepository = getRepository(OrganizationIdStorage);
    let nodePublicKeyStorageRepository = getRepository(NodePublicKeyStorage);

    let nodeSnapShotter = new NodeSnapShotter(
        nodeSnapShotRepository,
        new NodeSnapShotFactory(),
        nodePublicKeyStorageRepository,
        organizationIdStorageRepository
    );
    let organizationSnapShotter = new OrganizationSnapShotter(
        nodePublicKeyStorageRepository,
        organizationSnapShotRepository,
        organizationIdStorageRepository,
        new OrganizationSnapShotFactory()
    );

    let  nodeMeasurementDayV2Repository = getCustomRepository(NodeMeasurementDayV2Repository);
    let organizationMeasurementDayRepository = getCustomRepository(OrganizationMeasurementDayRepository);
    let networkMeasurementDayRepository = getCustomRepository(NetworkMeasurementDayRepository);
    let archiver = new Archiver(nodeMeasurementDayV2Repository, nodeSnapShotRepository, organizationSnapShotRepository);
    let measurementsRollupService = new MeasurementsRollupService(
        getRepository(MeasurementRollup),
        nodeMeasurementDayV2Repository,
        organizationMeasurementDayRepository,
        networkMeasurementDayRepository
    );

    return new CrawlResultProcessor(crawlV2Repository, nodeSnapShotter, organizationSnapShotter, measurementsRollupService, archiver, connection);
}

/**
 * Temporary. Remove after migration.
 */
function removeDuplicatePublicKeys(nodes: Node[]): Node[] {
    //filter out double public keys (nodes that switched ip address, or have the same public key running on different ip's at the same time)
    //statistics are lost because new ip
    let publicKeys = nodes.map((node: Node) => node.publicKey!);
    let duplicatePublicKeys: string[] = [];
    publicKeys.forEach((element, index) => {

        // Find if there is a duplicate or not
        if (publicKeys.indexOf(element, index + 1) > -1) {

            // Is the duplicate already registered?
            if (duplicatePublicKeys.indexOf(element) === -1) {
                duplicatePublicKeys.push(element);
            }
        }
    });

    duplicatePublicKeys.forEach(duplicatePublicKey => {
        console.log('duplicate publicKey: ' + duplicatePublicKey);
        let duplicateNodes = nodes.filter(node => node.publicKey === duplicatePublicKey);

        let nodeToKeep = duplicateNodes[0];
        console.log('with ip: ' + nodeToKeep.key);
        let originalDiscoveryDate = nodeToKeep.dateDiscovered;
        let nodesToDiscard = [];
        for (let i = 1; i < duplicateNodes.length; i++) {
            console.log('with ip: ' + duplicateNodes[i].key);
            if (duplicateNodes[i].dateDiscovered > nodeToKeep.dateDiscovered) {
                nodesToDiscard.push(nodeToKeep);
                nodeToKeep = duplicateNodes[i];
            } else {
                nodesToDiscard.push(duplicateNodes[i]);
                originalDiscoveryDate = duplicateNodes[i].dateDiscovered;
            }
        }

        let nodeWithName = duplicateNodes.find(node => node.name !== undefined && node.name !== null);
        if (nodeWithName !== undefined) {
            nodeToKeep.name = nodeWithName.name;
        }

        let nodeWithHost = duplicateNodes.find(node => node.host !== undefined && node.host !== null);
        if (nodeWithHost !== undefined) {
            nodeToKeep.host = nodeWithHost.host;
        }

        let nodeWithGeoData = duplicateNodes.find(node => node.geoData.longitude !== undefined && node.geoData.longitude !== null);
        if (nodeWithGeoData !== undefined) {
            nodeToKeep.geoData = nodeWithGeoData.geoData;
        }

        nodeToKeep.dateDiscovered = originalDiscoveryDate;

        nodesToDiscard.forEach(nodeToDiscard => {
            let index = nodes.indexOf(nodeToDiscard);
            if (index > -1) {
                nodes.splice(index, 1);
            }
        });
    });

    return nodes;
}

function shutdown(signal: string) {
    return () => {
        console.log(`Received ${signal}, waiting for 10 seconds to not interrupt process`);
        isShuttingDown = true;
        setTimeout(() => {
            console.log('...waited 10s, exiting.');
            process.exit(0);
        }, 10000).unref();
    };
}
