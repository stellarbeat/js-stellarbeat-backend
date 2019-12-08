import NodeStorageV2Repository from "../repositories/NodeStorageV2Repository";
import NodeSnapShotService from "./NodeSnapShotService";
import {Node} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../entities/CrawlV2";
import NodeStorageV2Factory from "../factory/NodeStorageV2Factory";
import * as Sentry from "@sentry/node";
import NodeStorageV2 from "../entities/NodeStorageV2";

export default class NodeStorageV2Service {
    protected nodeStorageV2Repository: NodeStorageV2Repository;
    protected nodeSnapShotService: NodeSnapShotService;
    protected nodeStorageV2Factory: NodeStorageV2Factory;

    constructor(nodeStorageV2Repository: NodeStorageV2Repository, nodeSnapShotService: NodeSnapShotService, nodeStorageV2Factory: NodeStorageV2Factory) {
        this.nodeStorageV2Repository = nodeStorageV2Repository;
        this.nodeSnapShotService = nodeSnapShotService;
        this.nodeStorageV2Factory = nodeStorageV2Factory;
    }

    async updateWithLatestCrawl(crawledNodes:Node[], crawl: CrawlV2){
        let latestSnapShots = await this.nodeSnapShotService.getLatestSnapShots();
        let snapShotsToSave = await this.nodeSnapShotService.getUpdatedSnapShots(latestSnapShots, crawledNodes, crawl);
        let nodeStoragesToSave: NodeStorageV2[] = [];
        let missingNodes = this.nodeSnapShotService.getCrawledNodesWithoutSnapShots(latestSnapShots, crawledNodes);

        await Promise.all(missingNodes.map(async missingNode => {
            try {
                let archivedNodeStorage = await this.nodeStorageV2Repository.findByPublicKeyWithLatestSnapShot(missingNode.publicKey);
                if(archivedNodeStorage) {
                    let updatedSnapShot = this.nodeSnapShotService.createUpdatedSnapShot(archivedNodeStorage.latestSnapshot, missingNode, crawl);
                    snapShotsToSave.push(updatedSnapShot);
                } else { //create new node storage
                    let nodeStorage = this.nodeStorageV2Factory.create(missingNode, crawl);
                    nodeStoragesToSave.push(nodeStorage);
                }
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));

        await this.nodeSnapShotService.saveSnapShots(snapShotsToSave);
        await this.nodeStorageV2Repository.save(nodeStoragesToSave);
    }
}