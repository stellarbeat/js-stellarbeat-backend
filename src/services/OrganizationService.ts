import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import {TomlService} from "../toml-service";
import {CrawlService} from "./CrawlService";

type OrganizationId = string;

export class OrganizationService {
    protected _crawlService: CrawlService;
    protected _tomlService: TomlService;

    constructor(crawlService: CrawlService, tomlService: TomlService){
        this._tomlService = tomlService;
        this._crawlService = crawlService;
    }

    protected isOrganization(organization: Organization | undefined): organization is Organization {
        return organization !== undefined
    }

    async updateOrganizations(nodes:Node[]) {
        let knownOrganizations = await this._crawlService.getOrganizationsFromLatestCrawl();

        let knownOrganizationMap = new Map<OrganizationId, Organization>();
        if(knownOrganizations)
            knownOrganizations.forEach(organization => knownOrganizationMap.set(organization.id, organization));

        let newOrganizations = new Map<OrganizationId, Organization>();

        await Promise.all(nodes.map(async node => {
            try {
                let toml = await this._tomlService.fetchToml(node);
                if (toml === undefined) {
                    return;
                }
                let organization = this._tomlService.getOrganization(toml);
                if(!organization) {
                    return;
                }

                let alreadyDiscoveredOrganization = newOrganizations.get(organization.id);
                if(alreadyDiscoveredOrganization){//another node already provided this org
                    organization = alreadyDiscoveredOrganization;
                } else {
                    console.log("New Organization found: " + organization.name);
                    newOrganizations.set(organization.id, organization);
                }
                organization.validators.push(node.publicKey);

                node.organizationId = organization.id;
            } catch (e) {
                console.log("error updating organization for: " + node.displayName + ': ' + e.message);
                //do nothing
            }
        }));

        Array.from(newOrganizations.values()).forEach(organization => {
            knownOrganizationMap.set(organization.id, organization); //update the organizations found in this crawl, leaving the others intact if, for example, the toml file was unavailable. todo: add discovery & update datetimes
        });

        let allOrganizationIds = nodes.map(node => node.organizationId);

        let ghostOrganizations = knownOrganizations //organization is not used anymore (maybe node got deleted)
            .filter(knownOrganization => allOrganizationIds.indexOf(knownOrganization.id) < 0);

        ghostOrganizations.forEach(ghostOrganization => knownOrganizationMap.delete(ghostOrganization.id));

        return Array.from(knownOrganizationMap.values());

    }
}