import {Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../entities/CrawlV2";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";

export default class OrganizationSnapShotFactory {
    create(organizationId:OrganizationIdStorage, organization: Organization, crawlStart: CrawlV2, validators: NodePublicKeyStorage[]){
        return this.fromOrganization(organizationId, organization, crawlStart, validators);
    }

    createUpdatedSnapShot(snapShot: OrganizationSnapShot, organization: Organization, crawl: CrawlV2, validators: NodePublicKeyStorage[]){
        return this.fromOrganization(snapShot.organizationIdStorage, organization, crawl, validators);
    }

    protected fromOrganization(organizationId:OrganizationIdStorage, organization: Organization, crawlStart: CrawlV2, validators: NodePublicKeyStorage[]) {
        let organizationSnapShot = new OrganizationSnapShot(organizationId, crawlStart);
        organizationSnapShot.name = organization.name;
        organization.dba ? organizationSnapShot.dba = organization.dba : organizationSnapShot.dba = null;
        organization.url ? organizationSnapShot.url = organization.url : organizationSnapShot.url = null;
        organization.officialEmail ? organizationSnapShot.officialEmail = organization.officialEmail : organizationSnapShot.officialEmail = null;
        organization.phoneNumber ? organizationSnapShot.phoneNumber = organization.phoneNumber : organizationSnapShot.phoneNumber = null;
        organization.physicalAddress ? organizationSnapShot.physicalAddress = organization.physicalAddress : organizationSnapShot.physicalAddress = null;
        organization.twitter ? organizationSnapShot.twitter = organization.twitter : organizationSnapShot.twitter = null;
        organization.github ? organizationSnapShot.github = organization.github : organizationSnapShot.github = null;
        organization.description ? organizationSnapShot.description = organization.description : organizationSnapShot.description = null;
        organization.keybase ? organizationSnapShot.keybase = organization.keybase : organizationSnapShot.keybase = null;
        organizationSnapShot.validators = validators;

        return organizationSnapShot;
    }
}