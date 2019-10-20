import {Connection, createConnection, getRepository} from "typeorm";
import TimeTravelMigration from "../entities/TimeTravelMigration";
import Crawl from "../entities/Crawl";
import CrawlV2 from "../entities/CrawlV2";
import NodeStorage from "../entities/NodeStorage";
import QuorumSetStorage from "../entities/QuorumSetStorage";
import GeoDataStorage from "../entities/GeoDataStorage";
import OrganizationStorageV2 from "../entities/OrganizationStorageV2";
import PublicKeyStorage from "../entities/PublicKeyStorage";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import {Node, QuorumSet} from "@Stellarbeat/js-stellar-domain";
import NodeStorageV2 from "../entities/NodeStorageV2";
import NodeService from "../services/NodeService";
// noinspection JSIgnoredPromiseFromCall
main();

type Hash = string;
type PublicKey = string;
type OrganizationId = string;

const nodeRepo = getRepository(NodeStorage);
const publicKeyRepo = getRepository(PublicKeyStorage);
const quorumSetRepo = getRepository(QuorumSetStorage);
const nodeV2Repo = getRepository(NodeStorageV2);

const nodeService = new NodeService();

let quorumSetCache = new Map<Hash, QuorumSetStorage>();
let organizationCache = new Map<OrganizationId, OrganizationStorageV2>();
let organizationIdCache = new Map<PublicKey, OrganizationIdStorage>();
let nodeStorageV2Cache = new Map<PublicKey, NodeStorageV2>();
let connection!: Connection;

async function main() {
    connection = await createConnection();
    let migrationEntity = await connection.manager.findOne(TimeTravelMigration);
    if (!migrationEntity)
        migrationEntity = new TimeTravelMigration();
    console.log("last migrated crawl id: " + migrationEntity.lastMigratedCrawl);
    await migrateCrawl(connection, migrationEntity);
    await connection.manager.save(migrationEntity);
    await connection.close();
}

async function migrateCrawl(connection: Connection, migrationEntity: TimeTravelMigration) {
    let crawl = await connection.manager.findOne(Crawl, migrationEntity.lastMigratedCrawl++);
    if (!crawl || !crawl.completed) {
        console.log("no valid crawl with id: " + migrationEntity.lastMigratedCrawl);
    } else {
        let crawlV2 = new CrawlV2(crawl.time, crawl.ledgers);
        let nodeEntities = await nodeRepo.find({where: {crawlId: crawl.id}});
        let nodes = nodeEntities.map(nodeEntity => {
            return Node.fromJSON(nodeEntity.nodeJson)
        });

        await Promise.all(nodes.map(async node => {
                let nodeV2 = await getStoredNodeV2FromLatestCrawl(node);
                if (!nodeV2)
                    await initializeNodeV2Storage(node, crawlV2);
                else {
                    await updateNodeV2StorageWithLatestCrawl(nodeV2, node, crawlV2);
                }
            })
        );
    }
}

async function updateNodeV2StorageWithLatestCrawl(nodeStorageV2: NodeStorageV2, node: Node, crawl: CrawlV2) {
    let quorumSetChanged = false;
    let ipPortChanged = false;
    let nodeDetailsChanged = false;
    let geoDataChanged = false;
    let organizationChanged = false;

    if(nodeStorageV2.quorumSet && nodeStorageV2.quorumSet.hash !== node.quorumSet.hashKey)
        quorumSetChanged = true;
    if(nodeService.nodeStorageV2IpPortChanged(node, nodeStorageV2))
        ipPortChanged = true;
    if(nodeService.nodeDetailsChanged(node, nodeStorageV2.nodeDetails))
        nodeDetailsChanged = true;
    if(nodeService.geoDataChanged(node, nodeStorageV2.geoData))
        geoDataChanged = true;
    /*if(nodeService.organizationChanged(node, organization))
        organizationChanged = true;*/

    if(!(quorumSetChanged || ipPortChanged || nodeDetailsChanged || geoDataChanged || organizationChanged))
        return;

    nodeStorageV2.crawlEnd = await connection.manager.findOne(Crawl, crawl.id --);
    await connection.manager.save(nodeStorageV2);


    let latestNodeStorageV2 = new NodeStorageV2(nodeStorageV2.publicKey, node.ip, node.port, crawl);
    if(!quorumSetChanged)
        latestNodeStorageV2.quorumSet = nodeStorageV2.quorumSet;
    else {
        latestNodeStorageV2.quorumSet = await getStoredQuorumSet(node.quorumSet.hashKey, node.quorumSet);
    }

    if(!nodeDetailsChanged)
        latestNodeStorageV2.nodeDetails = nodeStorageV2.nodeDetails;
    else {
        latestNodeStorageV2.nodeDetails = NodeDetailsStorage.fromNode(node);
    }

    if(!geoDataChanged)
        latestNodeStorageV2.geoData = nodeStorageV2.geoData;
    else
        latestNodeStorageV2.geoData = GeoDataStorage.fromGeoData(node.geoData);

    if(!organizationChanged){
        latestNodeStorageV2.organizationId =
            //Todo
    }

    nodeStorageV2Cache.set(node.publicKey, latestNodeStorageV2);
}

async function initializeNodeV2Storage(node: Node, crawlStart: CrawlV2) {
    let publicKeyStorage = await getStoredPublicKey(node.publicKey);
    let nodeStorageV2 = new NodeStorageV2(publicKeyStorage, node.ip, node.port, crawlStart);
    nodeStorageV2.quorumSet = await getStoredQuorumSet(node.quorumSet.hashKey, node.quorumSet);
    nodeStorageV2.nodeDetails = NodeDetailsStorage.fromNode(node);
    nodeStorageV2.geoData = GeoDataStorage.fromGeoData(node);
    await connection.manager.save(nodeStorageV2);
    nodeStorageV2Cache.set(publicKeyStorage.publicKey, nodeStorageV2);
}

async function getStoredNodeV2FromLatestCrawl(node: Node) {
    let nodeStorageV2 = nodeStorageV2Cache.get(node.publicKey);
    if (!nodeStorageV2) {
        nodeStorageV2 = await nodeV2Repo.findOne(
            {
                'relations': ["publicKey", "quorumSet", "nodeDetails", "geoData", "organizationId"],
                'where': {publicKey: node.publicKey, crawlEnd: null}
            }
        );
        if (nodeStorageV2)
            nodeStorageV2Cache.set(node.publicKey, nodeStorageV2);
    }

    return nodeStorageV2;
}

async function getStoredPublicKey(publicKey: PublicKey) {
    let publicKeyStorage = await publicKeyRepo.findOne({'where': {publicKey: publicKey}});

    if (!publicKeyStorage) {
        publicKeyStorage = new PublicKeyStorage(publicKey);
    }

    return publicKeyStorage;
}

async function getStoredQuorumSet(hash: Hash, quorumSet: QuorumSet) {
    let quorumSetStorage = quorumSetCache.get(hash);
    if (!quorumSetStorage)
        quorumSetStorage = await quorumSetRepo.findOne({'where': {hash: hash}});

    if (!quorumSetStorage) {
        quorumSetStorage = QuorumSetStorage.fromQuorumSet(quorumSet);
        await quorumSetRepo.save(quorumSetStorage);
    }

    quorumSetCache.set(hash, quorumSetStorage);

    return quorumSetStorage;
}

