import {Node} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import GeoDataStorage from "../entities/GeoDataStorage";
import NodeStorageV2 from "../entities/NodeStorageV2";

export default class NodeService {

    nodeStorageV2IpPortChanged(node: Node, nodeStorageV2: NodeStorageV2):boolean {
        return nodeStorageV2.ip !== node.ip
            || nodeStorageV2.port !== node.port;
    }
    nodeDetailsChanged(node: Node, nodeDetailsStorage?: NodeDetailsStorage):boolean {
        if (!nodeDetailsStorage)
            return true;

        if (nodeDetailsStorage.alias !== node.alias
            || nodeDetailsStorage.historyUrl !== node.historyUrl
            || nodeDetailsStorage.homeDomain !== node.homeDomain
            || nodeDetailsStorage.host !== node.host
            || nodeDetailsStorage.isp !== node.isp
            || nodeDetailsStorage.ledgerVersion !== node.ledgerVersion
            || nodeDetailsStorage.name !== node.name
            || nodeDetailsStorage.overlayMinVersion !== node.overlayMinVersion
            || nodeDetailsStorage.overlayVersion !== node.overlayVersion
            || nodeDetailsStorage.versionStr !== node.versionStr
        )
            return true;

        return false;
    }

    geoDataChanged(node:Node, geoDataStorage?: GeoDataStorage):boolean {
        if(!geoDataStorage)
            return true;

        return geoDataStorage.latitude !== node.geoData.latitude
            || geoDataStorage.longitude !== node.geoData.longitude;
    }
}