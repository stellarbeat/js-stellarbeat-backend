import {Node} from "@stellarbeat/js-stellar-domain";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import CrawlV2 from "../entities/CrawlV2";
import NodeStorageV2Service from "./NodeStorageV2Service";
import {Connection} from "typeorm";

export class CrawlV2Service {
    protected crawlRepository: CrawlV2Repository;
    protected nodeStorageService: NodeStorageV2Service;
    protected connection: Connection; //todo repositories & transaction

    constructor(
        crawlRepository: CrawlV2Repository,
        nodeStorageService: NodeStorageV2Service,
        connection: Connection) {
        this.crawlRepository = crawlRepository;
        this.nodeStorageService = nodeStorageService;
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

        let updatedSnapShots = await this.nodeStorageService.getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl(nodes, newCrawl);

        await this.connection.manager.save([...crawlsToSave, ...updatedSnapShots]);

        return newCrawl;
    }
}