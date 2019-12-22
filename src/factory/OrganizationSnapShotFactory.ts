import {Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../entities/CrawlV2";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";

export default class OrganizationSnapShotFactory {
    create(organizationId:OrganizationIdStorage, organization: Organization, crawlStart: CrawlV2){
        return new OrganizationSnapShot(organizationId, organization, crawlStart);
    }

    createUpdatedSnapShot(snapShot: OrganizationSnapShot, organization: Organization, crawl: CrawlV2){
        return new OrganizationSnapShot(snapShot.organizationId, organization, crawl);
    }
}