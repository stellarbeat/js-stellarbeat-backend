import {Connection, createConnection, getCustomRepository, getRepository, Repository} from "typeorm";
import TimeTravelMigration from "../entities/TimeTravelMigration";
import Crawl from "../entities/Crawl";
import SnapShotService from "../services/SnapShotService";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../factory/NodeSnapShotFactory";
import NodeStorage from "../entities/NodeStorage";
import {Node} from "@stellarbeat/js-stellar-domain";
import {CrawlResultProcessor} from "../services/CrawlResultProcessor";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";

// noinspection JSIgnoredPromiseFromCall
main();

let connection!: Connection;
let nodeRepo!: Repository<NodeStorage>;
let crawlV2Repository: CrawlV2Repository;
let crawlResultProcessor: CrawlResultProcessor;
let nodeSnapShotService: SnapShotService;

async function main() {
    connection = await createConnection();
    nodeRepo = getRepository(NodeStorage);
    crawlV2Repository = getCustomRepository(CrawlV2Repository);
    nodeSnapShotService = new SnapShotService(getCustomRepository(NodeSnapShotRepository), new NodeSnapShotFactory());
    crawlResultProcessor = new CrawlResultProcessor(crawlV2Repository, nodeSnapShotService, connection);
    let migrationEntity = await connection.manager.findOne(TimeTravelMigration);
    if (!migrationEntity)
        migrationEntity = new TimeTravelMigration();
    console.log("last migrated crawl id: " + migrationEntity.lastMigratedCrawl);

    while(true) {
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
