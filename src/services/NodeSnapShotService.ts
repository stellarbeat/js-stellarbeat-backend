import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import GeoDataStorage from "../entities/GeoDataStorage";
import NodeSnapShot from "../entities/NodeSnapShot";
import CrawlV2 from "../entities/CrawlV2";
/*import slugify from "@sindresorhus/slugify";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationStorageV2 from "../entities/OrganizationStorageV2";*/
import QuorumSetService from "./QuorumSetService";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";

export default class NodeSnapShotService {

    protected quorumSetService: QuorumSetService;
    protected nodeSnapShotRepository: NodeSnapShotRepository;

    constructor(
        quorumSetService: QuorumSetService,
        nodeStorageV2Repository: NodeSnapShotRepository
    )
    {
        this.quorumSetService = quorumSetService;
        this.nodeSnapShotRepository = nodeStorageV2Repository;
    }

    async createNewNodeSnapShot(node: Node, crawlStart: CrawlV2, organization?: Organization) {
        let nodeSnapShot = new NodeSnapShot(node.publicKey, node.ip, node.port, crawlStart);

        nodeSnapShot.quorumSet = await this.quorumSetService.getStoredQuorumSetOrCreateNew(node.quorumSet);
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

    nodeSnapShotIpPortChanged(node: Node, nodeSnapShot: NodeSnapShot):boolean {
        return nodeSnapShot.ip !== node.ip
            || nodeSnapShot.port !== node.port;
    }
    nodeDetailsChanged(node: Node, nodeDetailsStorage?: NodeDetailsStorage):boolean {
        if (!nodeDetailsStorage)
            return true;

        return nodeDetailsStorage.alias !== node.alias
            || nodeDetailsStorage.historyUrl !== node.historyUrl
            || nodeDetailsStorage.homeDomain !== node.homeDomain
            || nodeDetailsStorage.host !== node.host
            || nodeDetailsStorage.isp !== node.isp
            || nodeDetailsStorage.ledgerVersion !== node.ledgerVersion
            || nodeDetailsStorage.name !== node.name
            || nodeDetailsStorage.overlayMinVersion !== node.overlayMinVersion
            || nodeDetailsStorage.overlayVersion !== node.overlayVersion
            || nodeDetailsStorage.versionStr !== node.versionStr;
    }

    geoDataChanged(node:Node, geoDataStorage?: GeoDataStorage):boolean {
        if(!geoDataStorage)
            return true;

        return geoDataStorage.latitude !== node.geoData.latitude
            || geoDataStorage.longitude !== node.geoData.longitude;
    }
}