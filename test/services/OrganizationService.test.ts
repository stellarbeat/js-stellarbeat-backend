import {OrganizationService} from '../../src/services/OrganizationService';
import {TomlService} from "../../src";
import {CrawlService} from "../../src/services/CrawlService";
import {CrawlRepository} from "../../src/repositories/CrawlRepository";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import * as toml from "toml";

jest.mock('axios');
jest.mock('../../src/toml-service');
jest.mock('../../src/services/CrawlService');
jest.mock('../../src/repositories/CrawlRepository');

describe("updateOrganizations", () => {
    let organization = new Organization("1", "myOrg");
    let tomlOrgString = '[DOCUMENTATION]\n' +
        'ORG_NAME="myOrg"';
    let tomlOrgObject = toml.parse(tomlOrgString);
    let node = new Node("localhost");
    node.publicKey = 'a';
    node.homeDomain = "myDomain";
    let node2 = new Node("localhost");
    node2.publicKey = 'b';
    node2.homeDomain = "myDomain";

    (CrawlRepository as any).mockImplementation(() => {
        return {}
    });

    test('discoverNewOrganization', async () => {
        (TomlService as any).mockImplementation(() => {
            return {
                fetchToml: async () => {
                    return Promise.resolve(tomlOrgObject);
                },
                getOrganization: () => {
                    return organization;
                }
            };
        });
        (CrawlService as any).mockImplementation(() => {
            return {
                getOrganizationsFromLatestCrawl: async () => {
                    return Promise.resolve([]);
                },
            };
        });
        let organizationService = new OrganizationService(new CrawlService(), new TomlService());

        let organizations = await organizationService.updateOrganizations([node, node2], []);
        expect(organizations).toEqual([organization]);
        expect(node.organizationId).toEqual(organization.id);
        expect(node2.organizationId).toEqual(organization.id);
        expect(organizations[0].validators).toEqual([node.publicKey, node2.publicKey]);
    });
    test('organizationChangedDescription', async () => {
        let newOrganization = new Organization("1", "myOrg");
        newOrganization.description = "new description";
        (TomlService as any).mockImplementation(() => {
            return {
                fetchToml: async () => {
                    return Promise.resolve(tomlOrgObject);
                },
                getOrganization: () => {
                    return newOrganization;
                }
            };
        });
        (CrawlService as any).mockImplementation(() => {
            return {
                getOrganizationsFromLatestCrawl: async () => {
                    return Promise.resolve([organization]);
                },
            };
        });
        let organizationService = new OrganizationService(new CrawlService(), new TomlService());

        let organizations = await organizationService.updateOrganizations([node], []);

        expect(organizations).toEqual([newOrganization]);
        expect(node.organizationId).toEqual(newOrganization.id);
        expect(organizations[0].validators).toEqual([node.publicKey]);

    });
    test('organizationChangedName', async () => {
        node.organizationId = "1";
        let newOrganization = new Organization("2", "myNewOrg");
        (TomlService as any).mockImplementation(() => {
            return {
                fetchToml: async () => {
                    return Promise.resolve(tomlOrgObject);
                },
                getOrganization: () => {
                    return newOrganization;
                }
            };
        });
        (CrawlService as any).mockImplementation(() => {
            return {
                getOrganizationsFromLatestCrawl: async () => {
                    return Promise.resolve([organization]);
                },
            };
        });
        let organizationService = new OrganizationService(new CrawlService(), new TomlService());
        let organizations = await organizationService.updateOrganizations([node]);
        expect(organizations).toEqual([newOrganization]);
        expect(node.organizationId).toEqual(newOrganization.id);
    });

    test('ghostOrganization', async () => {
        node.organizationId = "2";
        let newOrganization = new Organization("2", "myNewOrg");
        (TomlService as any).mockImplementation(() => {
            return {
                fetchToml: async () => {
                    return Promise.resolve(tomlOrgObject);
                },
                getOrganization: () => {
                    return newOrganization;
                }
            };
        });
        (CrawlService as any).mockImplementation(() => {
            return {
                getOrganizationsFromLatestCrawl: async () => {
                    return Promise.resolve([organization]);
                },
            };
        });
        let organizationService = new OrganizationService(new CrawlService(), new TomlService());
        let organizations = await organizationService.updateOrganizations([node]);
        expect(organizations).toEqual([newOrganization]);
        expect(node.organizationId).toEqual(newOrganization.id);
    });
});
