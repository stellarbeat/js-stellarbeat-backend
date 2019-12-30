import {NodeMeasurementDayV2Repository} from "../repositories/NodeMeasurementDayV2Repository";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import {In} from "typeorm";
import CrawlV2 from "../entities/CrawlV2";

export default class Archiver {
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
    protected nodeSnapShotRepository: NodeSnapShotRepository;
    //protected nodePublicKeyStorage:

    constructor(nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository, nodeSnapShotRepository: NodeSnapShotRepository) {
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
        this.nodeSnapShotRepository = nodeSnapShotRepository;
    }

    async archiveNodes(crawl: CrawlV2){
        let nodePublicKeyStorageIds = (await this.nodeMeasurementDayV2Repository
            .findThirtyDayInactive())
            .map(result => result.nodePublicKeyStorageId);

        if(nodePublicKeyStorageIds.length === 0)
            return;

        let nodeSnapShots = await this.nodeSnapShotRepository.find({
            nodePublicKey: In(nodePublicKeyStorageIds)
        });

        nodeSnapShots.forEach(nodeSnapShot => nodeSnapShot.endCrawl = crawl);

        await this.nodeSnapShotRepository.save(nodeSnapShots);
    }
}