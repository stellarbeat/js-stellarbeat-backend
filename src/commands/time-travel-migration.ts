import {Connection, getRepository, Repository} from "typeorm";
import TimeTravelMigration from "../entities/TimeTravelMigration";
import Crawl from "../entities/Crawl";
import NodeStorage from "../entities/NodeStorage";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import {CrawlResultProcessor} from "../services/CrawlResultProcessor";
import * as Sentry from "@sentry/node";
import OrganizationStorage from "../entities/OrganizationStorage";
import CrawlV2 from "../entities/CrawlV2";
import Kernel from "../Kernel";

Sentry.init({dsn: process.env.SENTRY_DSN});

let isShuttingDown = false;
process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'));

let nodeRepo: Repository<NodeStorage>;
let organizationRepo: Repository<OrganizationStorage>;
let crawlResultProcessor: CrawlResultProcessor;
let kernel = new Kernel();

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
    console.log("starting migration");
    await kernel.initializeContainer();

    let maxCrawlId = await kernel.container.get(Connection).manager
        .query('select max("id") as "maxId" from crawl');
    console.log(maxCrawlId[0].maxId);
    nodeRepo = getRepository(NodeStorage);
    organizationRepo = getRepository(OrganizationStorage);
    crawlResultProcessor = kernel.container.get(CrawlResultProcessor);
    let migrationEntity = await kernel.container.get(Connection).manager.findOne(TimeTravelMigration);
    if (!migrationEntity)
        migrationEntity = new TimeTravelMigration();
    console.log("last migrated crawl id: " + migrationEntity.lastMigratedCrawl);

    while(migrationEntity.lastMigratedCrawl <= maxCrawlId[0].maxId) {
        if(isShuttingDown){
            console.time('Shutting down');
            process.exit(0);
        }
        console.time('migrate single crawl');
        await migrateCrawl(kernel.container.get(Connection), migrationEntity);
        await kernel.container.get(Connection).manager.save(migrationEntity);
        console.timeEnd('migrate single crawl');
    }
    await kernel.container.get(Connection).close();
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
        await crawlResultProcessor.processCrawl(migratedCrawl, nodes, organizations);
        console.log(migratedCrawl.id);
    }
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
            kernel.container.get(Connection).close();
            process.exit(0);
        }, 10000).unref();
    };
}
