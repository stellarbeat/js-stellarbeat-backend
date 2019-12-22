import {Node, Organization, PublicKey} from "@stellarbeat/js-stellar-domain";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import CrawlV2 from "../entities/CrawlV2";
import {Connection} from "typeorm";
import SnapShotService from "./SnapShotService";
import NodeMeasurementV2 from "../entities/NodeMeasurementV2";
import NodeSnapShot from "../entities/NodeSnapShot";

export class CrawlResultProcessor {
    protected crawlRepository: CrawlV2Repository;
    protected nodeSnapShotService: SnapShotService;
    protected connection: Connection; //todo repositories & transaction

    constructor(
        crawlRepository: CrawlV2Repository,
        nodeSnapShotService: SnapShotService,
        connection: Connection) {
        this.crawlRepository = crawlRepository;
        this.nodeSnapShotService = nodeSnapShotService;
        this.connection = connection;
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
        let allSnapShots = await this.nodeSnapShotService.updateOrCreateSnapShotsForNodes(nodes, new Set(), newCrawl);
console.log(allSnapShots);
        /*
        Step 2: Create node measurements for every active snapshot
         */
        await this.createNodeMeasurementsForSnapShots(nodes, allSnapShots, newCrawl);

        /*
        Step 3: rollup averages
         */

        /*
        Optional Step 4: store latest x days in cache table
        Another option is to compute live when data is requested.
         */

        return newCrawl;
    }

    private async createNodeMeasurementsForSnapShots(nodes: Node[], allSnapShots:NodeSnapShot[], newCrawl:CrawlV2) {
        let publicKeyToNodeMap = new Map<PublicKey, Node>(
            nodes.map(node => [node.publicKey, node])
        );

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