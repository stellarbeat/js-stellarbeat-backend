import {Network, Node, Organization, PublicKey} from "@stellarbeat/js-stellar-domain";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import CrawlV2 from "../entities/CrawlV2";
import {Connection} from "typeorm";
import NodeMeasurementV2 from "../entities/NodeMeasurementV2";
import NodeSnapShot from "../entities/NodeSnapShot";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import OrganizationMeasurement from "../entities/OrganizationMeasurement";
import OrganizationSnapShotter from "./SnapShotting/OrganizationSnapShotter";
import NodeSnapShotter from "./SnapShotting/NodeSnapShotter";
import NetworkMeasurement from "../entities/NetworkMeasurement";
import MeasurementsRollupService from "./MeasurementsRollupService";
import Archiver from "./Archiver";
import * as Sentry from "@sentry/node";
import {injectable} from "inversify";

export interface ICrawlResultProcessor {
    processCrawl(crawl: CrawlV2, nodes: Node[], organizations: Organization[], ledgers: number[]): Promise<CrawlV2>;
}

@injectable()
export class CrawlResultProcessor implements ICrawlResultProcessor {
    protected crawlRepository: CrawlV2Repository;
    protected organizationSnapShotter: OrganizationSnapShotter;
    protected nodeSnapShotter: NodeSnapShotter;
    protected connection: Connection; //todo repositories & transaction
    protected measurementRollupService: MeasurementsRollupService;
    protected archiver: Archiver;

    constructor(
        crawlRepository: CrawlV2Repository,
        nodeSnapShotter: NodeSnapShotter,
        organizationSnapShotter: OrganizationSnapShotter,
        measurementRollupService: MeasurementsRollupService,
        archiver: Archiver,
        connection: Connection) {
        this.crawlRepository = crawlRepository;
        this.nodeSnapShotter = nodeSnapShotter;
        this.connection = connection;
        this.organizationSnapShotter = organizationSnapShotter;
        this.measurementRollupService = measurementRollupService;
        this.archiver = archiver;
    }

    async processCrawl(crawl: CrawlV2, nodes: Node[], organizations: Organization[]) {

        await this.crawlRepository.save(crawl);
       /*
        Step 1: Create or update the active snapshots
         */
        let activeOrganizationSnapShots = await this.organizationSnapShotter.updateOrCreateSnapShots(organizations, crawl);

        let activeSnapShots = await this.nodeSnapShotter.updateOrCreateSnapShots(nodes, crawl);

        /*
        Step 2: Create Measurements
         */
        let publicKeyToNodeMap = new Map<PublicKey, Node>(
            nodes.map(node => [node.publicKey!, node])
        );

        try{
            await this.createNodeMeasurements(nodes, activeSnapShots, crawl, publicKeyToNodeMap);
        }catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }

        try{
            await this.createOrganizationMeasurements(organizations, activeOrganizationSnapShots, crawl, publicKeyToNodeMap);
        } catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }

        try{
            await this.createNetworkMeasurements(nodes, organizations, crawl);
        } catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }


        crawl.completed = true;

        await this.crawlRepository.save(crawl);

        /*
        Step 3: rollup measurements
         */
        try{
            await this.measurementRollupService.rollupMeasurements(crawl);
        }catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }

        /*
        Step 4: Archiving
         */
        try{
            await this.archiver.archiveNodes(crawl);//todo move up?
        } catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }

        try{
            await this.archiver.archiveOrganizations(crawl, activeOrganizationSnapShots, activeSnapShots);
        } catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }
        /*
        Optional Step 5: store latest x days in cache table
        Another option is to compute live when data is requested.
         */

        return crawl;
    }

    private async createNetworkMeasurements(nodes: Node[], organizations: Organization[], crawl: CrawlV2) {
        let network = new Network(nodes, organizations); //todo: inject?
        let networkMeasurement = new NetworkMeasurement(crawl);
        networkMeasurement.hasQuorumIntersection = network.graph.hasNetworkTransitiveQuorumSet(); //todo: should be calculated
        networkMeasurement.nrOfActiveNodes = network.nodes.filter(node => node.active).length;
        networkMeasurement.nrOfValidators = network.nodes.filter(node => node.active && node.isValidating).length;
        networkMeasurement.nrOfFullValidators = network.nodes.filter(node => node.active && node.isValidating && node.isFullValidator).length;
        networkMeasurement.nrOfOrganizations = organizations.length;
        networkMeasurement.transitiveQuorumSetSize = network.graph.networkTransitiveQuorumSet.size;

        await this.connection.manager.save(networkMeasurement);
    }

    private async createOrganizationMeasurements(organizations: Organization[], allSnapShots: OrganizationSnapShot[], crawl: CrawlV2, publicKeyToNodeMap: Map<PublicKey, Node>) {
        let organizationIdToOrganizationMap = new Map<string, Organization>(
            organizations.map(organization => [organization.id, organization])
        );

        let organizationMeasurements: OrganizationMeasurement[] = [];
        allSnapShots.forEach(snapShot => {
            let organization = organizationIdToOrganizationMap.get(snapShot.organizationIdStorage.organizationId);

            if (organization) {
                let organizationMeasurement = new OrganizationMeasurement(crawl.time, snapShot.organizationIdStorage);
                organizationMeasurement.isSubQuorumAvailable =
                    this.getOrganizationFailAt(organization, publicKeyToNodeMap) >= 1;
                organizationMeasurement.index = 0;//future proof
                organizationMeasurements.push(organizationMeasurement);
            }
        });

        await this.connection.manager.save(organizationMeasurements);
    }

    private getOrganizationFailAt(organization: Organization, publicKeyToNodeMap: Map<PublicKey, Node>) {
        let nrOfValidatingNodes = organization.validators
            .map(validator => publicKeyToNodeMap.get(validator))
            .filter(validator => validator !== undefined)
            .filter(validator => validator!.isValidating).length;
        return nrOfValidatingNodes - organization.subQuorumThreshold + 1;
    }

    private async createNodeMeasurements(nodes: Node[], allSnapShots: NodeSnapShot[], newCrawl: CrawlV2, publicKeyToNodeMap: Map<PublicKey, Node>) {

        let nodeMeasurements: NodeMeasurementV2[] = [];
        allSnapShots.forEach(snapShot => {
            let node = publicKeyToNodeMap.get(snapShot.nodePublicKey.publicKey);

            if (node) {
                let nodeMeasurement = NodeMeasurementV2.fromNode(newCrawl.time, snapShot.nodePublicKey, node);
                nodeMeasurements.push(nodeMeasurement);
            }

        });

        await this.connection.manager.save(nodeMeasurements);
    }
}