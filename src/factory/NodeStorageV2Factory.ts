import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../entities/CrawlV2";
import NodeSnapShotFactory from "./NodeSnapShotFactory";
import NodeStorageV2 from "../entities/NodeStorageV2";

export default class NodeStorageV2Factory {
    protected nodeSnapShotFactory: NodeSnapShotFactory;

    constructor(nodeSnapShotFactory:NodeSnapShotFactory){
        this.nodeSnapShotFactory = nodeSnapShotFactory;
    }

    create(node: Node, crawl: CrawlV2, organization?: Organization){
        let nodeV2Storage = new NodeStorageV2(node.publicKey);
        let nodeSnapshot = this.nodeSnapShotFactory.create(nodeV2Storage, node, crawl, organization);
        nodeV2Storage.latestSnapshot = nodeSnapshot;

        return nodeV2Storage;
    }
}