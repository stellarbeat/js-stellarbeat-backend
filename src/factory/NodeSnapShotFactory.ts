import NodeSnapShot from "../entities/NodeSnapShot";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../entities/CrawlV2";
import QuorumSetStorage from "../entities/QuorumSetStorage";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import GeoDataStorage from "../entities/GeoDataStorage";
import NodeStorageV2 from "../entities/NodeStorageV2";

export default class NodeSnapShotFactory {
    create(nodeStorage:NodeStorageV2, node: Node, crawlStart: CrawlV2, organization?: Organization){
        let nodeSnapShot = new NodeSnapShot(nodeStorage, crawlStart, node.ip, node.port);

        nodeSnapShot.quorumSet = QuorumSetStorage.fromQuorumSet(node.quorumSet);
        nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);
        nodeSnapShot.geoData = GeoDataStorage.fromGeoData(node.geoData);

        return nodeSnapShot;
    }

    createUpdatedSnapShot(snapShot: NodeSnapShot, crawledNode:Node, crawl: CrawlV2){
        let newSnapShot = new NodeSnapShot(snapShot.nodeStorage, crawl, crawledNode.ip, crawledNode.port);

        if (!snapShot.quorumSetChanged(crawledNode))
            newSnapShot.quorumSet = snapShot.quorumSet;
        else {
            newSnapShot.quorumSet = QuorumSetStorage.fromQuorumSet(crawledNode.quorumSet);
        }

        if (!snapShot.nodeDetailsChanged(crawledNode))
            newSnapShot.nodeDetails = snapShot.nodeDetails;
        else {
            newSnapShot.nodeDetails = NodeDetailsStorage.fromNode(crawledNode);
        }

        if (!snapShot.geoDataChanged(crawledNode ))
            newSnapShot.geoData = snapShot.geoData;
        else
            newSnapShot.geoData = GeoDataStorage.fromGeoData(crawledNode.geoData);

        /*if (!organizationChanged) {
            latestNodeStorageV2.organization = //new org storage
            //Todo
        }*/

        return newSnapShot;
    }
}