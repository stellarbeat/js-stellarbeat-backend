import {Node, Organization, PublicKey} from "@stellarbeat/js-stellar-domain";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import CrawlV2 from "../entities/CrawlV2";
import {Connection} from "typeorm";
import NodeMeasurementV2 from "../entities/NodeMeasurementV2";
import NodeSnapShot from "../entities/NodeSnapShot";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import OrganizationMeasurement from "../entities/OrganizationMeasurement";
import OrganizationSnapShotter from "./SnapShotting/OrganizationSnapShotter";
import NodeSnapShotter from "./SnapShotting/NodeSnapShotter";

export class CrawlResultProcessor {
    protected crawlRepository: CrawlV2Repository;
    protected organizationSnapShotter: OrganizationSnapShotter;
    protected nodeSnapShotter: NodeSnapShotter;
    protected connection: Connection; //todo repositories & transaction

    constructor(
        crawlRepository: CrawlV2Repository,
        nodeSnapShotter: NodeSnapShotter,
        organizationSnapShotter: OrganizationSnapShotter,
        connection: Connection) {
        this.crawlRepository = crawlRepository;
        this.nodeSnapShotter = nodeSnapShotter;
        this.connection = connection;
        this.organizationSnapShotter = organizationSnapShotter;
    }

    async processCrawl(nodes: Node[], organizations: Organization[], ledgers: number[]) {
        let latestCrawl = await this.crawlRepository.findLatest();
        let crawlsToSave = [];
        let validFromNewCrawl;
        if (!latestCrawl) {
            validFromNewCrawl = new Date();
        } else {
            crawlsToSave.push(latestCrawl);
            validFromNewCrawl = latestCrawl.validFrom;
        }

        let newCrawl = new CrawlV2(validFromNewCrawl, ledgers);
        crawlsToSave.push(newCrawl);
        await this.crawlRepository.save(crawlsToSave);

        /*
        Step 1: Create or update the active snapshots
         */
        let activeOrganizationSnapShots = await this.organizationSnapShotter.updateOrCreateSnapShots(organizations, newCrawl);

        let activeSnapShots = await this.nodeSnapShotter.updateOrCreateSnapShots(nodes, newCrawl);

        /*
        Step 2: Create node measurements for every active snapshot
         */
        let publicKeyToNodeMap = new Map<PublicKey, Node>(
            nodes.map(node => [node.publicKey, node])
        );

        await this.createNodeMeasurementsForSnapShots(nodes, activeSnapShots, newCrawl, publicKeyToNodeMap);
        await this.createOrganizationMeasurementsForSnapShots(organizations, activeOrganizationSnapShots, newCrawl, publicKeyToNodeMap);

        /*
        Step 3: rollup averages
         */

        /*
        Step 4: Archiving
         */

        /*
        Optional Step 5: store latest x days in cache table
        Another option is to compute live when data is requested.
         */

        return newCrawl;
    }

    private async createOrganizationMeasurementsForSnapShots(organizations:Organization[], allSnapShots: OrganizationSnapShot[], crawl: CrawlV2, publicKeyToNodeMap:Map<PublicKey, Node>){
        let organizationIdToOrganizationMap = new Map<string, Organization>(
            organizations.map(organization => [organization.id, organization])
        );

        let organizationMeasurements: OrganizationMeasurement[] = [];
        allSnapShots.forEach(snapShot => {
            let organization = organizationIdToOrganizationMap.get(snapShot.organizationIdStorage.organizationId);
            let organizationMeasurement = new OrganizationMeasurement(crawl, snapShot.organizationIdStorage);

            if (organization) {
                organizationMeasurement.isSubQuorumAvailable =
                    this.getOrganizationFailAt(organization, publicKeyToNodeMap) >= 1;
                organizationMeasurement.index = 0;//future proof
            } else {
                organizationMeasurement.isSubQuorumAvailable = false;
                organizationMeasurement.index = 0;
            }
            organizationMeasurements.push(organizationMeasurement);
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

    private async createNodeMeasurementsForSnapShots(nodes: Node[], allSnapShots:NodeSnapShot[], newCrawl:CrawlV2, publicKeyToNodeMap:Map<PublicKey, Node>) {

        let nodeMeasurements: NodeMeasurementV2[] = [];
        allSnapShots.forEach(snapShot => {
            let node = publicKeyToNodeMap.get(snapShot.nodePublicKey.publicKey);
            let nodeMeasurement = new NodeMeasurementV2(newCrawl, snapShot.nodePublicKey);

            if (node) {
                nodeMeasurement.isValidating = node.isValidating;
                nodeMeasurement.isOverLoaded = node.overLoaded;
                nodeMeasurement.isFullValidator = node.isFullValidator;
                nodeMeasurement.isActive = node.active;
                nodeMeasurement.index = node.index;
            } else {
                nodeMeasurement.isValidating = false;
                nodeMeasurement.isOverLoaded = false;
                nodeMeasurement.isFullValidator = false;
                nodeMeasurement.isActive = false;
                nodeMeasurement.index = 0;
            }
            nodeMeasurements.push(nodeMeasurement);
        });

        await this.connection.manager.save(nodeMeasurements);
    }
}