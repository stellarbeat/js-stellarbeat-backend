import {Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../entities/CrawlV2";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";

export default class OrganizationSnapShotFactory {
    create(organizationId:OrganizationIdStorage, organization: Organization, crawlStart: CrawlV2){
        let organizationSnapShot = new OrganizationSnapShot(organizationId, organization, crawlStart);
        organizationSnapShot.validators = [];

        return organizationSnapShot;
    }

    createUpdatedSnapShot(snapShot: OrganizationSnapShot, organization: Organization, crawl: CrawlV2){
        let organizationSnapShot = new OrganizationSnapShot(snapShot.organizationIdStorage, organization, crawl);
        organizationSnapShot.validators = []; //validators are added on the ManyToOne side

        return organizationSnapShot;
    }
}