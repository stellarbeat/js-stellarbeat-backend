import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import GeoDataStorage from "../entities/GeoDataStorage";
import NodeSnapShot from "../entities/NodeSnapShot";
import CrawlV2 from "../entities/CrawlV2";
/*import slugify from "@sindresorhus/slugify";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationStorageV2 from "../entities/OrganizationStorageV2";*/
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import QuorumSetStorage from "../entities/QuorumSetStorage";

export default class NodeSnapShotService {

    protected nodeSnapShotRepository: NodeSnapShotRepository;

    constructor(
        nodeStorageV2Repository: NodeSnapShotRepository
    )
    {
        this.nodeSnapShotRepository = nodeStorageV2Repository;
    }

    async createNewNodeSnapShot(node: Node, crawlStart: CrawlV2, organization?: Organization) {
        let nodeSnapShot = new NodeSnapShot(node.publicKey, node.ip, node.port, crawlStart);

        nodeSnapShot.quorumSet = QuorumSetStorage.fromQuorumSet(node.quorumSet);
        nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);
        nodeSnapShot.geoData = GeoDataStorage.fromGeoData(node.geoData);

        /*if (organization) {
            let urlFriendlyName = slugify(organization.name);
            let organizationStorageV2 = organizationStorageV2Cache.get(urlFriendlyName);
            if (!organizationStorageV2) { //initialize
                let organizationIdStorage = await getStoredOrganizationId(urlFriendlyName);
                if (!organizationIdStorage) {
                    organizationIdStorage = new OrganizationIdStorage(urlFriendlyName);
                }
                organizationStorageV2 = new OrganizationStorageV2(
                    organizationIdStorage,
                    {
                        name: organization.name,
                        dba: organization.dba,
                        url: organization.url,
                        logo: organization.logo,
                        description: organization.description,
                        physicalAddress: organization.physicalAddress,
                        physicalAddressAttestation: organization.physicalAddressAttestation,
                        phoneNumber: organization.phoneNumber,
                        phoneNumberAttestation: organization.phoneNumberAttestation,
                        keybase: organization.keybase,
                        twitter: organization.twitter,
                        github: organization.github,
                        officialEmail: organization.officialEmail,
                        validators: organization.validators
                    });
                organizationStorageV2Cache.set(urlFriendlyName, organizationStorageV2);
            }
            nodeStorageV2.organization = organizationStorageV2;
        }*/
        await this.nodeSnapShotRepository.save(nodeSnapShot);

        return nodeSnapShot;
    }

    quorumSetChanged(node: Node, nodeSnapShot: NodeSnapShot): boolean {
        if(!nodeSnapShot.quorumSet)
            return node.isValidator;

        return nodeSnapShot.quorumSet.hash !== node.quorumSet.hashKey;
    }

    nodeIpPortChanged(node: Node, nodeSnapShot: NodeSnapShot):boolean {
        return nodeSnapShot.ip !== node.ip
            || nodeSnapShot.port !== node.port;
    }
    nodeDetailsChanged(node: Node, nodeSnapShot: NodeSnapShot):boolean {
        if(!nodeSnapShot.nodeDetails)
            return node.versionStr !== undefined || node.overlayVersion !== undefined || node.overlayMinVersion !== undefined || node.ledgerVersion !== undefined;

        return nodeSnapShot.nodeDetails.alias !== node.alias
            || nodeSnapShot.nodeDetails.historyUrl !== node.historyUrl
            || nodeSnapShot.nodeDetails.homeDomain !== node.homeDomain
            || nodeSnapShot.nodeDetails.host !== node.host
            || nodeSnapShot.nodeDetails.isp !== node.isp
            || nodeSnapShot.nodeDetails.ledgerVersion !== node.ledgerVersion
            || nodeSnapShot.nodeDetails.name !== node.name
            || nodeSnapShot.nodeDetails.overlayMinVersion !== node.overlayMinVersion
            || nodeSnapShot.nodeDetails.overlayVersion !== node.overlayVersion
            || nodeSnapShot.nodeDetails.versionStr !== node.versionStr;
    }

    geoDataChanged(node:Node, nodeSnapShot: NodeSnapShot):boolean {
        if(!nodeSnapShot.geoData) {
           return node.geoData.latitude !== undefined || node.geoData.longitude !== undefined;
        }

        return nodeSnapShot.geoData.latitude !== node.geoData.latitude
            || nodeSnapShot.geoData.longitude !== node.geoData.longitude;
    }
}