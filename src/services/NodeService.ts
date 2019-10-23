import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../entities/NodeDetailsStorage";
import GeoDataStorage from "../entities/GeoDataStorage";
import NodeStorageV2 from "../entities/NodeStorageV2";
import CrawlV2 from "../entities/CrawlV2";
/*import slugify from "@sindresorhus/slugify";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationStorageV2 from "../entities/OrganizationStorageV2";*/
import PublicKeyService from "./PublicKeyService";
import QuorumSetService from "./QuorumSetService";
import NodeV2Repository from "../repositories/NodeV2Repository";

export default class NodeService {

    protected publicKeyService: PublicKeyService;
    protected quorumSetService: QuorumSetService;
    protected nodeStorageV2Repository: NodeV2Repository;

    constructor(
        publicKeyService: PublicKeyService,
        quorumSetService: QuorumSetService,
        nodeStorageV2Repository: NodeV2Repository
    )
    {
        this.publicKeyService = publicKeyService;
        this.quorumSetService = quorumSetService;
        this.nodeStorageV2Repository = nodeStorageV2Repository;
    }

    async createNewNodeV2Storage(node: Node, crawlStart: CrawlV2, organization?: Organization) {
        let publicKeyStorage = await this.publicKeyService.getStoredPublicKeyOrCreateNew(node.publicKey);
        let nodeStorageV2 = new NodeStorageV2(publicKeyStorage, node.ip, node.port, crawlStart);

        nodeStorageV2.quorumSet = await this.quorumSetService.getStoredQuorumSetOrCreateNew(node.quorumSet);
        nodeStorageV2.nodeDetails = NodeDetailsStorage.fromNode(node);
        nodeStorageV2.geoData = GeoDataStorage.fromGeoData(node.geoData);

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
        await this.nodeStorageV2Repository.save(nodeStorageV2);

        return nodeStorageV2;
    }

    nodeStorageV2IpPortChanged(node: Node, nodeStorageV2: NodeStorageV2):boolean {
        return nodeStorageV2.ip !== node.ip
            || nodeStorageV2.port !== node.port;
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