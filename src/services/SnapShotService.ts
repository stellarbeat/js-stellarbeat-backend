import {Node, PublicKey} from "@stellarbeat/js-stellar-domain";
import NodeSnapShot from "../entities/NodeSnapShot";
import CrawlV2 from "../entities/CrawlV2";
/*import slugify from "@sindresorhus/slugify";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationStorageV2 from "../entities/OrganizationStorageV2";*/
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../factory/NodeSnapShotFactory";
import NodePublicKey from "../entities/NodePublicKey";
import * as Sentry from "@sentry/node";

export default class SnapShotService {

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

    /**
     *
     * Returns all the latest snapshots, including newly created ones.
     */
    async updateOrCreateSnapShotsForNodes(nodes: Node[], crawl: CrawlV2) {
        let latestSnapShots = await this.getActiveSnapShots();
        await this.updateExistingSnapShots(latestSnapShots, nodes, crawl);
        let nodesWithoutSnapShots = this.getCrawledNodesWithoutSnapShots(latestSnapShots, nodes);
        let newSnapShots = await this.createSnapShots(nodesWithoutSnapShots, crawl);

        return [...latestSnapShots, ...newSnapShots];

    }

    async getActiveSnapShots(){
        return await this.nodeSnapShotRepository.findActiveWithOrganizations();
    }

    /**
     * Nodes that are new or were inactive for a long time and were archived
     */
    getCrawledNodesWithoutSnapShots(latestSnapShots:NodeSnapShot[], crawledNodes:Node[]){
        let snapShotsMap = new Map(latestSnapShots
            .map(snapshot => [snapshot.nodePublicKey.publicKey, snapshot])
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
    async updateExistingSnapShots(latestSnapShots:NodeSnapShot[], crawledNodes:Node[], crawl: CrawlV2) {
        let crawledNodesMap = this.getPublicKeyToNodeMap(crawledNodes);
        await Promise.all(latestSnapShots.map(async (snapShot: NodeSnapShot) => {
            try {
                let crawledNode = crawledNodesMap.get(snapShot.nodePublicKey.publicKey);
                if (crawledNode && snapShot.hasNodeChanged(crawledNode)) {
                    snapShot.endCrawl = crawl;
                    snapShot.current = false;
                    let newSnapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(snapShot, crawledNode, crawl);
                    await this.nodeSnapShotRepository.save([snapShot, newSnapShot])

                }
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));
    };

    async createSnapShots(nodesWithoutSnapShots: Node[], crawl: CrawlV2) {
            let newSnapShots: NodeSnapShot[] = [];
            await Promise.all(nodesWithoutSnapShots.map(async (nodeWithoutSnapShot: Node) => {
                try {
                    let archivedSnapShot = await this.findByPublicKeyWithLatestSnapShot(nodeWithoutSnapShot.publicKey);
                    console.log(archivedSnapShot);
                    if (archivedSnapShot) {
                        let updatedSnapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(archivedSnapShot, nodeWithoutSnapShot, crawl);
                        archivedSnapShot.current = false;
                        await this.nodeSnapShotRepository.save([archivedSnapShot, updatedSnapShot]);
                        newSnapShots.push(updatedSnapShot);
                    } else { //create new node storage and snapshot
                        let nodeV2Storage = new NodePublicKey(nodeWithoutSnapShot.publicKey, crawl.validFrom);
                        let snapShot = this.nodeSnapShotFactory.create(nodeV2Storage, nodeWithoutSnapShot, crawl);

                        newSnapShots.push(snapShot);
                        await this.nodeSnapShotRepository.save(snapShot);
                    }
                } catch (e) {
                    console.log(e);
                    Sentry.captureException(e);
                }
            }));

            return newSnapShots;
        }


    protected getPublicKeyToNodeMap(nodes: Node[]) {
        return new Map(nodes
            .filter(node => node.publicKey)
            .map(node => [node.publicKey, node])
        );
    }

    async findByPublicKeyWithLatestSnapShot(publicKey: PublicKey) {
        return await this.nodeSnapShotRepository.findLatestByPublicKey(publicKey);
    }
}