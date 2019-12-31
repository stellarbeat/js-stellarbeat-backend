import NodeSnapShotter from "./SnapShotting/NodeSnapShotter";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";

export default class CrawlV2Service {

    protected nodeSnapShotter: NodeSnapShotter;
    protected crawlV2Repository: CrawlV2Repository;

    constructor(crawlV2Repository: CrawlV2Repository, nodeSnapShotter: NodeSnapShotter) {
        this.nodeSnapShotter = nodeSnapShotter;
        this.crawlV2Repository = crawlV2Repository;
    }

    async getLatestNodes(){
        return this.nodeSnapShotter.getLatestNodes();
    }

    async getNodesAt(time: Date){

    }
}