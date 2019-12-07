import {Node} from "@stellarbeat/js-stellar-domain";
import NodeSnapShot from "../entities/NodeSnapShot";
import CrawlV2 from "../entities/CrawlV2";
/*import slugify from "@sindresorhus/slugify";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationStorageV2 from "../entities/OrganizationStorageV2";*/
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../factory/NodeSnapShotFactory";

export default class NodeSnapShotService {

    protected nodeSnapShotRepository: NodeSnapShotRepository;
    protected nodeSnapShotFactory: NodeSnapShotFactory;

    constructor(
        nodeSnapShotRepository: NodeSnapShotRepository,
        nodeSnapShotFactory: NodeSnapShotFactory
    )
    {
        this.nodeSnapShotRepository = nodeSnapShotRepository;
        this.nodeSnapShotFactory = nodeSnapShotFactory;
    }

    async updateSnapShotsWithNewCrawl(crawledNodes:Node[], crawl: CrawlV2) {
        let latestSnapShots = await this.nodeSnapShotRepository.findLatest();
        let snapShotsToSave = this.getUpdatedSnapShots(latestSnapShots, crawledNodes, crawl);
        await this.nodeSnapShotRepository.save(snapShotsToSave);

    }

    /**
     * Nodes that changed public keys. The snapshot associated with the old public key remains unchanged until it is archived.
     * todo: add measurements! Don't forget to archive when necessary!
     */
    getSnapShotsWithoutCrawledNodes(latestSnapShots:NodeSnapShot[], crawledNodes:Node[]) {
        let crawledNodesMap = this.getPublicKeyToNodeMap(crawledNodes);
        let snapShots:NodeSnapShot[] = [];
        latestSnapShots.forEach((snapShot: NodeSnapShot) => {
            let node = crawledNodesMap.get(snapShot.nodeStorage.publicKey);
            if (!node) {
                snapShots.push(snapShot);
            }
        });

        return snapShots;
    }

    /**
     * Nodes that are new or were inactive for a long time and were archived
     */
    getCrawledNodesWithoutSnapShots(latestSnapShots:NodeSnapShot[], crawledNodes:Node[]){
        let snapShotsMap = new Map(latestSnapShots
            .map(snapshot => [snapshot.nodeStorage.publicKey, snapshot])
        );

        let nodes:Node[] = [];
        crawledNodes.forEach(node => {
            let snapShot = snapShotsMap.get(node.publicKey);
            if (!snapShot) {
                nodes.push(node);
            }
        });

        return nodes;
    }

    /**
     * Nodes with updated properties (quorumSet, geo, ip, ...)
     */
    getUpdatedSnapShots(latestSnapShots:NodeSnapShot[], crawledNodes:Node[], crawl: CrawlV2) {
        let crawledNodesMap = this.getPublicKeyToNodeMap(crawledNodes);
        let updatedAndNewSnapShots:NodeSnapShot[] = [];
        latestSnapShots.forEach((snapShot: NodeSnapShot) => {
            let crawledNode = crawledNodesMap.get(snapShot.nodeStorage.publicKey);
            if (crawledNode && snapShot.hasNodeChanged(crawledNode)) {
                snapShot.crawlEnd = crawl;
                updatedAndNewSnapShots.push(snapShot);
                updatedAndNewSnapShots.push(this.nodeSnapShotFactory.createUpdatedSnapShot(snapShot, crawledNode, crawl));
            }
        });

        return updatedAndNewSnapShots;
    };

    protected getPublicKeyToNodeMap(nodes: Node[]) {
        return new Map(nodes
            .filter(node => node.publicKey)
            .map(node => [node.publicKey, node])
        );
    }
}