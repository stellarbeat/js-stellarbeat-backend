import {Connection, createConnection, getCustomRepository, getRepository, Repository} from "typeorm";
import TimeTravelMigration from "../entities/TimeTravelMigration";
import Crawl from "../entities/Crawl";
import CrawlV2 from "../entities/CrawlV2";
import NodeStorageV2Service from "../services/NodeStorageV2Service";
import NodeStorageV2Repository from "../repositories/NodeStorageV2Repository";
import NodeSnapShotService from "../services/NodeSnapShotService";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../factory/NodeSnapShotFactory";
import NodeStorageV2Factory from "../factory/NodeStorageV2Factory";
import NodeStorage from "../entities/NodeStorage";
import {Node} from "@stellarbeat/js-stellar-domain";

// noinspection JSIgnoredPromiseFromCall
main();

let connection!: Connection;
let nodeRepo!: Repository<NodeStorage>;
let nodeStorageV2Service: NodeStorageV2Service;
async function main() {
    connection = await createConnection();
    nodeRepo = getRepository(NodeStorage);
    nodeStorageV2Service = new NodeStorageV2Service(
        getCustomRepository(NodeStorageV2Repository),
        new NodeSnapShotService(getCustomRepository(NodeSnapShotRepository), new NodeSnapShotFactory()),
        new NodeStorageV2Factory(new NodeSnapShotFactory())
    );
    let migrationEntity = await connection.manager.findOne(TimeTravelMigration);
    if (!migrationEntity)
        migrationEntity = new TimeTravelMigration();
    console.log("last migrated crawl id: " + migrationEntity.lastMigratedCrawl);

    await migrateCrawl(connection, migrationEntity);
    await connection.manager.save(migrationEntity);
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
        let crawlV2 = new CrawlV2(crawl.time, crawl.ledgers);

        await nodeStorageV2Service.updateWithLatestCrawl(nodes, crawlV2);
    }
}
