import NodeStorageV2Repository from "../repositories/NodeStorageV2Repository";
import NodeSnapShotService from "./NodeSnapShotService";
import {Node} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../entities/CrawlV2";
import NodeStorageV2Factory from "../factory/NodeStorageV2Factory";
import * as Sentry from "@sentry/node";
import NodeSnapShot from "../entities/NodeSnapShot";

export default class NodeStorageV2Service {
    protected nodeStorageV2Repository: NodeStorageV2Repository;
    protected nodeSnapShotService: NodeSnapShotService;
    protected nodeStorageV2Factory: NodeStorageV2Factory;

    constructor(nodeStorageV2Repository: NodeStorageV2Repository, nodeSnapShotService: NodeSnapShotService, nodeStorageV2Factory: NodeStorageV2Factory) {
        this.nodeStorageV2Repository = nodeStorageV2Repository;
        this.nodeSnapShotService = nodeSnapShotService;
        this.nodeStorageV2Factory = nodeStorageV2Factory;
    }

    async getNodeStorageEntitiesAndSnapShotsUpdatedWithCrawl(crawledNodes:Node[], crawl: CrawlV2):Promise<NodeSnapShot[]>{
        let latestSnapShots = await this.nodeSnapShotService.getLatestSnapShots();
        let allSnapShots = this.nodeSnapShotService.getSnapShotsUpdatedWithCrawl(latestSnapShots, crawledNodes, crawl);
        let nodesWithoutSnapShots = this.nodeSnapShotService.getCrawledNodesWithoutSnapShots(latestSnapShots, crawledNodes);

        await Promise.all(nodesWithoutSnapShots.map(async (nodeWithoutSnapShot:Node) => {
            try {
                let archivedNodeStorage = await this.nodeStorageV2Repository.findByPublicKeyWithLatestSnapShot(nodeWithoutSnapShot.publicKey);

                if(archivedNodeStorage) {
                    if(archivedNodeStorage.latestSnapshot) {
                        let updatedSnapShot = this.nodeSnapShotService.createUpdatedSnapShot(archivedNodeStorage.latestSnapshot, nodeWithoutSnapShot, crawl);
                        allSnapShots.push(updatedSnapShot);
                    } else {
                        allSnapShots.push(this.nodeSnapShotService.createSnapShot(archivedNodeStorage, nodeWithoutSnapShot, crawl));
                    }

                } else { //create new node storage and snapshot
                    let nodeStorage = this.nodeStorageV2Factory.create(nodeWithoutSnapShot, crawl);
                    allSnapShots.push(nodeStorage.latestSnapshot!);
                }
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));

        return allSnapShots;
    }
}