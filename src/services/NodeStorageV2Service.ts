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

    /**
     * Get new snapshots for new or archived nodes
     * @param nodesWithoutSnapShots
     * @param crawl
     */
    public async getMissingNodeStoresAndSnapShots(nodesWithoutSnapShots: Node[], crawl: CrawlV2) {
        let missingSnapShots:NodeSnapShot[] = [];
        await Promise.all(nodesWithoutSnapShots.map(async (nodeWithoutSnapShot: Node) => {
            try {
                let archivedNodeStorage = await this.nodeStorageV2Repository.findByPublicKeyWithLatestSnapShot(nodeWithoutSnapShot.publicKey);

                if (archivedNodeStorage) {
                    if (!archivedNodeStorage.latestSnapshot)
                        throw new Error('NodeStorage cannot exist without latest snapshot: ' + archivedNodeStorage.publicKey);
                    if (archivedNodeStorage.latestSnapshot.endCrawl === null) {
                        throw new Error('Archived node cannot have null end crawl: ' + archivedNodeStorage.publicKey);
                    }
                    let updatedSnapShot = this.nodeSnapShotService.createUpdatedSnapShot(archivedNodeStorage.latestSnapshot, nodeWithoutSnapShot, crawl);
                    missingSnapShots.push(updatedSnapShot);
                } else { //create new node storage and snapshot
                    let nodeStorage = this.nodeStorageV2Factory.create(nodeWithoutSnapShot, crawl);
                    missingSnapShots.push(nodeStorage.latestSnapshot!);
                }
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));

        return missingSnapShots;
    }
}