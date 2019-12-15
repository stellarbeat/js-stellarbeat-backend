import {Node} from "@stellarbeat/js-stellar-domain";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import CrawlV2 from "../entities/CrawlV2";
import NodeStorageV2Service from "./NodeStorageV2Service";
import {Connection} from "typeorm";
import NodeSnapShotService from "./NodeSnapShotService";

export class CrawlResultProcessor {
    protected crawlRepository: CrawlV2Repository;
    protected nodeStorageService: NodeStorageV2Service;
    protected nodeSnapShotService: NodeSnapShotService;
    protected connection: Connection; //todo repositories & transaction

    constructor(
        crawlRepository: CrawlV2Repository,
        nodeStorageService: NodeStorageV2Service,
        nodeSnapShotService: NodeSnapShotService,
        connection: Connection) {
        this.crawlRepository = crawlRepository;
        this.nodeStorageService = nodeStorageService;
        this.nodeSnapShotService = nodeSnapShotService;
        this.connection = connection;
    }

    async processCrawl(nodes: Node[], ledgers: number[]) {
        let latestCrawl = await this.crawlRepository.findLatest();
        let crawlsToSave = [];
        let validFromNewCrawl;
        if(!latestCrawl){
            validFromNewCrawl = new Date();
        } else {
            crawlsToSave.push(latestCrawl);
            validFromNewCrawl = latestCrawl.validFrom;
        }

        let newCrawl = new CrawlV2(validFromNewCrawl, ledgers);

        let latestSnapShots = await this.nodeSnapShotService.getLatestSnapShots();
        let updatedSnapShots = this.nodeSnapShotService.getSnapShotsUpdatedWithCrawl(latestSnapShots, nodes, newCrawl);
        let nodesWithoutSnapShots = this.nodeSnapShotService.getCrawledNodesWithoutSnapShots(latestSnapShots, nodes);
        let missingSnapShots = await this.nodeStorageService.getMissingNodeStoresAndSnapShots(nodesWithoutSnapShots, newCrawl);

        //let snapShotsWithoutCrawledNodes = this.nodeSnapShotService.getSnapShotsWithoutCrawledNodes(latestSnapShots, nodes);


        await this.connection.manager.save([...crawlsToSave, ...updatedSnapShots, ...missingSnapShots]);

        return newCrawl;
    }
}