import NodeSnapShot from "../entities/NodeSnapShot";
import {Node} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../entities/CrawlV2";
import NodeQuorumSetStorage from "../entities/NodeQuorumSetStorage";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import NodeGeoDataStorage from "../entities/NodeGeoDataStorage";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";

export default class NodeSnapShotFactory {
    create(nodePublicKey: NodePublicKeyStorage, node: Node, crawlStart: CrawlV2, organizationSnapShot: OrganizationSnapShot|null) {
        let nodeSnapShot = new NodeSnapShot(nodePublicKey, crawlStart, node.ip, node.port);

        nodeSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);
        nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);
        nodeSnapShot.geoData = NodeGeoDataStorage.fromGeoData(node.geoData);
        nodeSnapShot.organizationSnapShot = organizationSnapShot;

        return nodeSnapShot;
    }

    createUpdatedSnapShot(snapShot: NodeSnapShot, crawledNode: Node, crawl: CrawlV2, organizationSnapShot: OrganizationSnapShot|null) {
        let newSnapShot = new NodeSnapShot(snapShot.nodePublicKey, crawl, crawledNode.ip, crawledNode.port);

        if (!snapShot.quorumSetChanged(crawledNode))
            newSnapShot.quorumSet = snapShot.quorumSet;
        else {
            newSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(crawledNode.quorumSet);
        }

        if (!snapShot.nodeDetailsChanged(crawledNode))
            newSnapShot.nodeDetails = snapShot.nodeDetails;
        else {
            newSnapShot.nodeDetails = NodeDetailsStorage.fromNode(crawledNode);
        }

        if (!snapShot.geoDataChanged(crawledNode))
            newSnapShot.geoData = snapShot.geoData;
        else
            newSnapShot.geoData = NodeGeoDataStorage.fromGeoData(crawledNode.geoData);

        if (!snapShot.organizationSnapShotChanged(organizationSnapShot))
            newSnapShot.organizationSnapShot = snapShot.organizationSnapShot;
        else
            newSnapShot.organizationSnapShot = organizationSnapShot;

        return newSnapShot;
    }
}