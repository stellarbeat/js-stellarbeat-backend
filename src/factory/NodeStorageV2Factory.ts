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
        let nodeV2Storage = new NodeStorageV2(node.publicKey, crawl.time);
        nodeV2Storage.latestSnapshot = this.nodeSnapShotFactory.create(nodeV2Storage, node, crawl, organization);

        return nodeV2Storage;
    }
}