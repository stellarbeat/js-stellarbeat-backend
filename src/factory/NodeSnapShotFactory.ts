import NodeSnapShot from "../entities/NodeSnapShot";
import {Node} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../entities/CrawlV2";
import NodeQuorumSetStorage from "../entities/NodeQuorumSetStorage";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import NodeGeoDataStorage from "../entities/NodeGeoDataStorage";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";

export default class NodeSnapShotFactory {
    create(nodePublicKey: NodePublicKeyStorage, node: Node, crawlStart: CrawlV2, organizationSnapShot: OrganizationSnapShot | null = null) {
        let nodeSnapShot = new NodeSnapShot(nodePublicKey, crawlStart, node.ip, node.port);

        nodeSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);
        nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);
        nodeSnapShot.geoData = NodeGeoDataStorage.fromGeoData(node.geoData);
        nodeSnapShot.organizationSnapShot = organizationSnapShot;
        if (organizationSnapShot !== null) {
            this.updateOrganizationSnapShotValidators(null, nodeSnapShot, organizationSnapShot, null);
        }

        return nodeSnapShot;
    }

    createUpdatedSnapShot(nodeSnapShot: NodeSnapShot, crawledNode: Node, crawl: CrawlV2, organizationSnapShot: OrganizationSnapShot | null = null, previousOrganizationSnapShot: OrganizationSnapShot|null) {
        let newSnapShot = new NodeSnapShot(nodeSnapShot.nodePublicKey, crawl, crawledNode.ip, crawledNode.port);

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

        newSnapShot.organizationSnapShot = organizationSnapShot;

        if (organizationSnapShot !== null) {
            this.updateOrganizationSnapShotValidators(nodeSnapShot, newSnapShot, organizationSnapShot, previousOrganizationSnapShot);
        }

        return newSnapShot;
    }

    protected updateOrganizationSnapShotValidators(oldNodeSnapShot: NodeSnapShot | null, newNodeSnapShot: NodeSnapShot, organizationSnapShot: OrganizationSnapShot, previousOrganizationSnapShot: OrganizationSnapShot|null) {
        if (organizationSnapShot.validators === undefined) {
            throw new Error('validators not loaded from database for organization: ' + organizationSnapShot.organizationIdStorage.organizationId)
        }

        if (previousOrganizationSnapShot !== null && oldNodeSnapShot !== null) {
            if (previousOrganizationSnapShot.validators === undefined) {
                throw new Error('validators not loaded from database for organization: ' + previousOrganizationSnapShot.organizationIdStorage.organizationId)
            }

            /*
            Clean up old validator references in organization snapshots
             */
            if(previousOrganizationSnapShot.validators.includes(oldNodeSnapShot)){
                previousOrganizationSnapShot.validators.splice(
                    previousOrganizationSnapShot.validators.indexOf(oldNodeSnapShot),
                    1
                );
            }

            if(organizationSnapShot.validators.includes(oldNodeSnapShot)) {
                organizationSnapShot.validators.splice(
                    organizationSnapShot.validators.indexOf(oldNodeSnapShot),
                    1
                );
            }
        }

        organizationSnapShot.validators.push(newNodeSnapShot);
    }
}