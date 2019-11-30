import {Connection, createConnection, getCustomRepository, getRepository} from "typeorm";
import TimeTravelMigration from "../entities/TimeTravelMigration";
import Crawl from "../entities/Crawl";
import CrawlV2 from "../entities/CrawlV2";
import NodeStorage from "../entities/NodeStorage";
import QuorumSetStorage from "../entities/QuorumSetStorage";
import GeoDataStorage from "../entities/GeoDataStorage";
import OrganizationStorageV2 from "../entities/OrganizationStorageV2";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import {Node, Organization} from "@Stellarbeat/js-stellar-domain";
import NodeSnapShot from "../entities/NodeSnapShot";
import NodeSnapShotService from "../services/NodeSnapShotService";
import slugify from '@sindresorhus/slugify';
import QuorumSetService from "../services/QuorumSetService";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";

// noinspection JSIgnoredPromiseFromCall
main();

type PublicKey = string;
type OrganizationId = string;

const nodeRepo = getRepository(NodeStorage);
const quorumSetRepo = getRepository(QuorumSetStorage);
const nodeV2Repo = getCustomRepository(NodeSnapShotRepository);
const organizationIdRepo = getRepository(OrganizationIdStorage);
//const organizationV2Repo = getRepository(OrganizationStorageV2);

const quorumSetService = new QuorumSetService(quorumSetRepo);
const nodeService = new NodeSnapShotService(quorumSetService, nodeV2Repo);

let organizationStorageV2Cache = new Map<OrganizationId, OrganizationStorageV2>();
let organizationIdStorageCache = new Map<OrganizationId, OrganizationIdStorage>();
let nodeStorageV2Cache = new Map<PublicKey, NodeSnapShot>();
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

async function updateNodeV2StorageWithLatestCrawl(nodeStorageV2: NodeSnapShot, node: Node, crawl: CrawlV2, organization?: Organization) {
    let quorumSetChanged = false;
    let ipPortChanged = false;
    let nodeDetailsChanged = false;
    let geoDataChanged = false;
    let organizationChanged = false;

    if (nodeStorageV2.quorumSet && nodeStorageV2.quorumSet.hash !== node.quorumSet.hashKey)
        quorumSetChanged = true;
    if (nodeService.nodeIpPortChanged(node, nodeStorageV2))
        ipPortChanged = true;
    if (nodeService.nodeDetailsChanged(node, nodeStorageV2.nodeDetails))
        nodeDetailsChanged = true;
    if (nodeService.geoDataChanged(node, nodeStorageV2.geoData))
        geoDataChanged = true;
    /*if (nodeService.organizationChanged(node, organization))
        organizationChanged = true;*/

    if (!(quorumSetChanged || ipPortChanged || nodeDetailsChanged || geoDataChanged || organizationChanged))
        return;

    nodeStorageV2.crawlEnd = await connection.manager.findOne(Crawl, crawl.id--);
    await connection.manager.save(nodeStorageV2);


    let latestNodeStorageV2 = new NodeSnapShot(node.publicKey, node.ip, node.port, crawl);
    if (!quorumSetChanged)
        latestNodeStorageV2.quorumSet = nodeStorageV2.quorumSet;
    else {
        latestNodeStorageV2.quorumSet = await quorumSetService.getStoredQuorumSetOrCreateNew(node.quorumSet);
    }

    if (!nodeDetailsChanged)
        latestNodeStorageV2.nodeDetails = nodeStorageV2.nodeDetails;
    else {
        latestNodeStorageV2.nodeDetails = NodeDetailsStorage.fromNode(node);
    }

    if (!geoDataChanged)
        latestNodeStorageV2.geoData = nodeStorageV2.geoData;
    else
        latestNodeStorageV2.geoData = GeoDataStorage.fromGeoData(node.geoData);

    /*if (!organizationChanged) {
        latestNodeStorageV2.organization = //new org storage
        //Todo
    }*/

    nodeStorageV2Cache.set(node.publicKey, latestNodeStorageV2);
}

async function initializeNodeV2Storage(node: Node, crawlStart: CrawlV2, organization?: Organization) {
    let nodeStorageV2 = await nodeService.createNewNodeSnapShot(node, crawlStart, organization);
    if (organization) {
        let urlFriendlyName = slugify(organization.name);
        let organizationStorageV2 = organizationStorageV2Cache.get(urlFriendlyName);
        if (!organizationStorageV2) { //initialize
            let organizationIdStorage = await getStoredOrganizationId(urlFriendlyName);
            if (!organizationIdStorage) {
                organizationIdStorage = new OrganizationIdStorage(urlFriendlyName);
            }
            organizationStorageV2 = new OrganizationStorageV2(
                organizationIdStorage,
                {
                    name: organization.name,
                    dba: organization.dba,
                    url: organization.url,
                    logo: organization.logo,
                    description: organization.description,
                    physicalAddress: organization.physicalAddress,
                    physicalAddressAttestation: organization.physicalAddressAttestation,
                    phoneNumber: organization.phoneNumber,
                    phoneNumberAttestation: organization.phoneNumberAttestation,
                    keybase: organization.keybase,
                    twitter: organization.twitter,
                    github: organization.github,
                    officialEmail: organization.officialEmail,
                    validators: organization.validators
                });
            organizationStorageV2Cache.set(urlFriendlyName, organizationStorageV2);
        }
        nodeStorageV2.organization = organizationStorageV2;
    }
    await connection.manager.save(nodeStorageV2);
}

async function getStoredOrganizationId(urlFriendlyName: string) {
    let organizationIdStorage = organizationIdStorageCache.get(urlFriendlyName);
    if (!organizationIdStorage) {
        organizationIdStorage = await organizationIdRepo.findOne(
            {
                'where': {organizationId: urlFriendlyName}
            }
        );
        if (organizationIdStorage)
            organizationIdStorageCache.set(urlFriendlyName, organizationIdStorage);
    }

    return organizationIdStorage;
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
