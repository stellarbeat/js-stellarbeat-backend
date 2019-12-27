import {Node, Organization, OrganizationId, PublicKey} from "@stellarbeat/js-stellar-domain";
import NodeSnapShot from "../entities/NodeSnapShot";
import CrawlV2 from "../entities/CrawlV2";
/*import slugify from "@sindresorhus/slugify";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationStorageV2 from "../entities/OrganizationStorageV2";*/
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../factory/NodeSnapShotFactory";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import * as Sentry from "@sentry/node";
import OrganizationSnapShotRepository from "../repositories/OrganizationSnapShotRepository";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import OrganizationSnapShotFactory from "../factory/OrganizationSnapShotFactory";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import {Repository} from "typeorm";

export default class SnapShotService {

    protected nodeSnapShotRepository: NodeSnapShotRepository;
    protected nodeSnapShotFactory: NodeSnapShotFactory;
    protected nodePublicKeyStorageRepository: Repository<NodePublicKeyStorage>;
    protected organizationSnapShotRepository: OrganizationSnapShotRepository;
    protected organizationIdStorageRepository: Repository<OrganizationIdStorage>;
    protected organizationSnapShotFactory: OrganizationSnapShotFactory;

    constructor(
        nodeSnapShotRepository: NodeSnapShotRepository,
        nodeSnapShotFactory: NodeSnapShotFactory,
        nodePublicKeyStorageRepository: Repository<NodePublicKeyStorage>,
        organizationSnapShotRepository: OrganizationSnapShotRepository,
        organizationIdStorageRepository: Repository<OrganizationIdStorage>,
        organizationSnapShotFactory: OrganizationSnapShotFactory
    ) {
        this.nodeSnapShotRepository = nodeSnapShotRepository;
        this.nodeSnapShotFactory = nodeSnapShotFactory;
        this.organizationSnapShotRepository = organizationSnapShotRepository;
        this.organizationIdStorageRepository = organizationIdStorageRepository;
        this.organizationSnapShotFactory = organizationSnapShotFactory;
        this.nodePublicKeyStorageRepository = nodePublicKeyStorageRepository;
    }

    async updateOrCreateSnapShotsForOrganizations(organizations: Organization[], crawl: CrawlV2) {
        let activeOrganizationSnapShots = await this.organizationSnapShotRepository.findActive();
        activeOrganizationSnapShots = await this.updateActiveOrganizationSnapShots(activeOrganizationSnapShots, organizations, crawl);
        let organizationsWithoutSnapShots = this.getOrganizationsWithoutSnapShots(activeOrganizationSnapShots, organizations);
        let newOrganizationSnapShots = await this.createOrganizationSnapShots(organizationsWithoutSnapShots, crawl);

        return [...activeOrganizationSnapShots, ...newOrganizationSnapShots];
    }

    /**
     *
     * Returns all the latest snapshots, including newly created ones.
     */
    async updateOrCreateSnapShotsForNodes(nodes: Node[], crawl: CrawlV2) {
        let activeNodeSnapShots = await this.getActiveNodeSnapShots();
        activeNodeSnapShots = await this.updateActiveNodeSnapShots(activeNodeSnapShots, nodes, crawl);
        let nodesWithoutSnapShots = this.getCrawledNodesWithoutSnapShots(activeNodeSnapShots, nodes);
        let newNodeSnapShots = await this.createNodeSnapShots(nodesWithoutSnapShots, crawl);

        return [...activeNodeSnapShots, ...newNodeSnapShots];

    }

    async getActiveNodeSnapShots() {
        return await this.nodeSnapShotRepository.findActive();
    }

    /**
     * Nodes that are new or were inactive for a long time and were archived
     */
    protected getCrawledNodesWithoutSnapShots(activeNodeSnapShots: NodeSnapShot[], crawledNodes: Node[]) {
        let snapShotsMap = new Map(Array.from(activeNodeSnapShots)
            .map(snapshot => [snapshot.nodePublicKey.publicKey, snapshot])
        );

        let nodes: Node[] = [];
        crawledNodes.forEach(node => {
            let snapShot = snapShotsMap.get(node.publicKey);
            if (!snapShot) {
                nodes.push(node);
            }
        });

        return nodes;
    }

    /**
     * Organizations that are new or were inactive for a long time and were archived
     */
    protected getOrganizationsWithoutSnapShots(activeOrganizationSnapShots: OrganizationSnapShot[], organizations: Organization[]) {
        let snapShotsMap = new Map(activeOrganizationSnapShots
            .map(snapshot => [snapshot.organizationIdStorage.organizationId, snapshot])
        );

        let organizationsWithoutSnapShots: Organization[] = [];
        organizations.forEach(organization => {
            let snapShot = snapShotsMap.get(organization.id);
            if (!snapShot) {
                organizationsWithoutSnapShots.push(organization);
            }
        });

        return organizationsWithoutSnapShots;
    }

    protected async updateActiveOrganizationSnapShots(activeOrganizationSnapShots: OrganizationSnapShot[], organizations: Organization[], crawl: CrawlV2) {
        let organizationMap = this.getIdToOrganizationMap(organizations);
        let newActiveOrganizationSnapShots: OrganizationSnapShot[] = [];
        await Promise.all(activeOrganizationSnapShots.map(async (organizationSnapShot) => {
            try {
                let organization = organizationMap.get(organizationSnapShot.organizationIdStorage.organizationId);
                if (organization) {
                    let updatedOrganizationSnapShot = await this.updateActiveOrganizationSnapShot(organizationSnapShot, organization, crawl);
                    newActiveOrganizationSnapShots.push(updatedOrganizationSnapShot);
                } else {
                    newActiveOrganizationSnapShots.push(organizationSnapShot);
                }
            } catch (e) {
                console.log(e); //todo winston
                Sentry.captureException(e);
            }
        }));

        return newActiveOrganizationSnapShots;
    }

    protected async updateActiveOrganizationSnapShot(activeOrganizationSnapShot: OrganizationSnapShot, organization: Organization, crawl: CrawlV2) {
        if (activeOrganizationSnapShot.organizationChanged(organization)) {
            activeOrganizationSnapShot.endCrawl = crawl;
            let validators:NodePublicKeyStorage[];
            if(activeOrganizationSnapShot.validatorsChanged(organization)){
                validators = await Promise.all(organization.validators.map(publicKey => this.findOrCreateNodePublicKeyStorage(publicKey, crawl))); //todo: could be more efficient
            } else {
                validators = activeOrganizationSnapShot.validators;
            }
            let newSnapShot = this.organizationSnapShotFactory.createUpdatedSnapShot(activeOrganizationSnapShot, organization, crawl, validators);
            await this.organizationSnapShotRepository.save([activeOrganizationSnapShot, newSnapShot]);

            return newSnapShot;
        } else {
            return activeOrganizationSnapShot;
        }
    }

    /**
     * Nodes with updated properties (quorumSet, geo, ip, ...)
     */
    protected async updateActiveNodeSnapShots(activeNodeSnapShots: NodeSnapShot[], crawledNodes: Node[], crawl: CrawlV2) {
        let crawledNodesMap = this.getPublicKeyToNodeMap(crawledNodes);
        let newActiveNodeSnapShots: NodeSnapShot[] = [];

        await Promise.all(activeNodeSnapShots.map(async (snapShot: NodeSnapShot) => {
            try {
                let crawledNode = crawledNodesMap.get(snapShot.nodePublicKey.publicKey);
                if (crawledNode) {
                    let updatedActiveSnapShot = await this.updateSingleActiveNodeSnapShot(snapShot, crawledNode, crawl);
                    newActiveNodeSnapShots.push(updatedActiveSnapShot);
                } else { //node not retrieved in crawl, but is active until the snapshot is archived
                    //organization is not updated
                    newActiveNodeSnapShots.push(snapShot);
                }
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));

        return newActiveNodeSnapShots;
    };

    protected async updateSingleActiveNodeSnapShot(activeNodeSnapShot: NodeSnapShot, node: Node, crawl: CrawlV2) {
        if (activeNodeSnapShot.hasNodeChanged(node)) {
            activeNodeSnapShot.endCrawl = crawl;

            let organizationIdStorage:OrganizationIdStorage|null;
            if(activeNodeSnapShot.organizationChanged(node)){
                organizationIdStorage = await this.findOrCreateOrganizationIdStorage(node.organizationId!, crawl);
            } else {
                organizationIdStorage = activeNodeSnapShot.organizationIdStorage;
            }

            let newSnapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(activeNodeSnapShot, node, crawl, organizationIdStorage);
            await this.nodeSnapShotRepository.save([activeNodeSnapShot, newSnapShot]);

            return newSnapShot;
        } else {
            return activeNodeSnapShot;
        }
    }

    protected async createNodeSnapShots(nodesWithoutSnapShots: Node[], crawl: CrawlV2) {
        let newSnapShots: NodeSnapShot[] = [];

        await Promise.all(nodesWithoutSnapShots.map(async (nodeWithoutSnapShot: Node) => {
            try {

                let nodePublicKeyStorage = await this.findOrCreateNodePublicKeyStorage(nodeWithoutSnapShot.publicKey, crawl);
                let organizationIdStorage:OrganizationIdStorage|null = null;
                if(nodeWithoutSnapShot.organizationId)
                    organizationIdStorage = await this.findOrCreateOrganizationIdStorage(nodeWithoutSnapShot.organizationId, crawl);

                let snapShot = this.nodeSnapShotFactory.create(nodePublicKeyStorage, nodeWithoutSnapShot, crawl, organizationIdStorage);
                await this.nodeSnapShotRepository.save(snapShot);
                newSnapShots.push(snapShot);

            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));

        return newSnapShots;
    }

    protected async createOrganizationSnapShots(organizationsWithoutSnapShots: Organization[], crawl: CrawlV2) {
        let newSnapShots: OrganizationSnapShot[] = [];
        await Promise.all(organizationsWithoutSnapShots.map(async (organizationWithoutSnapShot) => {
            try {
                let organizationIdStorage = await this.findOrCreateOrganizationIdStorage(organizationWithoutSnapShot.id, crawl);
                let validators = await Promise.all(organizationWithoutSnapShot.validators.map(publicKey => this.findOrCreateNodePublicKeyStorage(publicKey, crawl)));
                let newOrganizationSnapShot = this.organizationSnapShotFactory.create(organizationIdStorage, organizationWithoutSnapShot, crawl, validators);
                await this.organizationSnapShotRepository.save(newOrganizationSnapShot);
                newSnapShots.push(newOrganizationSnapShot);
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));

        return newSnapShots;
    }

    protected async findOrCreateNodePublicKeyStorage(publicKey: PublicKey, crawl: CrawlV2){
        let nodePublicKeyStorage = await this.nodePublicKeyStorageRepository.findOne({
            where: {publicKey: publicKey}
        });

        if (!nodePublicKeyStorage) {
            nodePublicKeyStorage = new NodePublicKeyStorage(publicKey, crawl.validFrom);
        }

        return nodePublicKeyStorage;
    }

    protected async findOrCreateOrganizationIdStorage(organizationId: OrganizationId, crawl: CrawlV2){
        let organizationIdStorage = await this.organizationIdStorageRepository.findOne({
            where: {organizationId: organizationId}
        });

        if (!organizationIdStorage) {
            organizationIdStorage = new OrganizationIdStorage(organizationId, crawl.validFrom);
        }

        return organizationIdStorage;
    }

    protected getPublicKeyToNodeMap(nodes: Node[]) {
        return new Map(nodes
            .filter(node => node.publicKey)
            .map(node => [node.publicKey, node])
        );
    }

    protected getIdToOrganizationMap(organizations: Organization[]) {
        return new Map(organizations
            .map(org => [org.id, org])
        );
    }
}