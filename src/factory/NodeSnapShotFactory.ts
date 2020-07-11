import NodeSnapShot from "../entities/NodeSnapShot";
import {Node} from "@stellarbeat/js-stellar-domain";
import NodeQuorumSetStorage from "../entities/NodeQuorumSetStorage";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import NodeGeoDataStorage from "../entities/NodeGeoDataStorage";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import {injectable} from "inversify";
@injectable()
export default class NodeSnapShotFactory {
    create(nodePublicKey: NodePublicKeyStorage, node: Node, startTime: Date, organizationIdStorage: OrganizationIdStorage | null = null) {
        let nodeSnapShot = new NodeSnapShot(nodePublicKey, startTime, node.ip, node.port);

        nodeSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);
        nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);
        nodeSnapShot.geoData = NodeGeoDataStorage.fromGeoData(node.geoData);
        nodeSnapShot.organizationIdStorage = organizationIdStorage;

        return nodeSnapShot;
    }

    createUpdatedSnapShot(nodeSnapShot: NodeSnapShot, crawledNode: Node, startTime: Date, organizationIdStorage: OrganizationIdStorage|null) {
        let newSnapShot = new NodeSnapShot(nodeSnapShot.nodePublicKey, startTime, crawledNode.ip, crawledNode.port);
        nodeSnapShot.endDate = startTime;

        if (!nodeSnapShot.quorumSetChanged(crawledNode))
            newSnapShot.quorumSet = nodeSnapShot.quorumSet;
        else {
            newSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(crawledNode.quorumSet);
        }

        if (!nodeSnapShot.nodeDetailsChanged(crawledNode))
            newSnapShot.nodeDetails = nodeSnapShot.nodeDetails;
        else {
            newSnapShot.nodeDetails = NodeDetailsStorage.fromNode(crawledNode);
        }

        if (!nodeSnapShot.geoDataChanged(crawledNode))
            newSnapShot.geoData = nodeSnapShot.geoData;
        else
            newSnapShot.geoData = NodeGeoDataStorage.fromGeoData(crawledNode.geoData);

        newSnapShot.organizationIdStorage = organizationIdStorage;

        return newSnapShot;
    }
}