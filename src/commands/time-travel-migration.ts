import {Connection, createConnection, getCustomRepository, getRepository, Repository} from "typeorm";
import TimeTravelMigration from "../entities/TimeTravelMigration";
import Crawl from "../entities/Crawl";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../factory/NodeSnapShotFactory";
import NodeStorage from "../entities/NodeStorage";
import {Node} from "@stellarbeat/js-stellar-domain";
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

Sentry.init({dsn: process.env.SENTRY_DSN});

let isShuttingDown = false;
process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'));

// noinspection JSIgnoredPromiseFromCall
main();

let connection!: Connection;
let nodeRepo!: Repository<NodeStorage>;
let crawlResultProcessor: CrawlResultProcessor;

async function main() {
    connection = await createConnection();
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
    //TODO: logging & fixtures for end to end testing
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

        await crawlResultProcessor.processCrawl(nodes, [], crawl.ledgers);
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

function shutdown(signal: string) {
    return () => {
        console.log(`${signal}...`);
        isShuttingDown = true;
        setTimeout(() => {
            console.log('...waited 5s, exiting.');
            process.exit(0);
        }, 5000).unref();
    };
}
