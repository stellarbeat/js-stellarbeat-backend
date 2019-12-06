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
        let snapShotsToSave = this.getUpdatedOrNewSnapShots(latestSnapShots, crawledNodes, crawl);
        await this.nodeSnapShotRepository.save(snapShotsToSave);
    }

    public getUpdatedOrNewSnapShots(latestSnapShots:NodeSnapShot[], crawledNodes:Node[], crawl: CrawlV2){
        let crawledNodesMap = new Map(crawledNodes
            .filter(node => node.publicKey)
            .map(node => [node.publicKey, node])
        );
        let crawledNodesToProcess = new Set(crawledNodes.map(node => node.publicKey));

        let snapShotsToSave:NodeSnapShot[] = [];

        latestSnapShots.forEach((snapShot: NodeSnapShot) => {
            if(crawledNodesToProcess.has(snapShot.nodeStorage.publicKey)){
                let crawledNode = crawledNodesMap.get(snapShot.nodeStorage.publicKey);
                if(!crawledNode) {
                    throw Error('Crawled node not found but should be present: ' + snapShot.nodeStorage.publicKey);
                }
                crawledNodesToProcess.delete(snapShot.nodeStorage.publicKey);
                console.log('node found in latest crawl: ' + crawledNode.publicKey);

                if(!snapShot.hasNodeChanged(crawledNode)) {
                    return;
                }
                console.log('node has changed in latest crawl: ' + crawledNode.publicKey);
                snapShot.crawlEnd = crawl;
                snapShotsToSave.push(snapShot);
                snapShotsToSave.push(this.nodeSnapShotFactory.createUpdatedSnapShot(snapShot, crawledNode, crawl));
            }
            //todo handle snapshots that are not crawled: could happen when a node changes public key
        });

        //Todo: handle crawled nodes that have no snapshot

        return snapShotsToSave;
    }
}