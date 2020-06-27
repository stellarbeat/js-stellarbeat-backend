import {OrganizationService} from '../../src/services/OrganizationService';
import {TomlService} from "../../src";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import {parse} from "toml";

describe("updateOrganizations", () => {
    let organization = new Organization("1", "myOrg");
    let tomlOrgString = '[DOCUMENTATION]\n' +
        'ORG_NAME="myOrg"';
    let tomlOrgObject = parse(tomlOrgString);
    let node = new Node("localhost");
    node.publicKey = 'a';
    node.homeDomain = "myDomain";
    let node2 = new Node("localhost");
    node2.publicKey = 'b';
    node2.homeDomain = "myDomain";

    test('discoverNewOrganization', async () => {
        let tomlService = new TomlService();
        jest.spyOn(tomlService, 'fetchToml').mockImplementation( () => tomlOrgObject);
        jest.spyOn(tomlService, 'getOrganization').mockReturnValue( organization);
        let organizationService = new OrganizationService(tomlService);

        let organizations = await organizationService.updateOrganizations([node, node2], []);
        expect(organizations).toEqual([organization]);
        expect(node.organizationId).toEqual(organization.id);
        expect(node2.organizationId).toEqual(organization.id);
        expect(organizations[0].validators).toEqual([node.publicKey, node2.publicKey]);
    });
    test('organizationChangedDescription', async () => {
        let newOrganization = new Organization("1", "myOrg");
        newOrganization.description = "new description";
        let tomlService = new TomlService();
        jest.spyOn(tomlService, 'fetchToml').mockImplementation( () => tomlOrgObject);
        jest.spyOn(tomlService, 'getOrganization').mockReturnValue( newOrganization);

        let organizationService = new OrganizationService(tomlService);

        let organizations = await organizationService.updateOrganizations([node], []);

        expect(organizations).toEqual([newOrganization]);
        expect(node.organizationId).toEqual(newOrganization.id);
        expect(organizations[0].validators).toEqual([node.publicKey]);

    });
    test('organizationChangedName', async () => {
        node.organizationId = "1";
        let newOrganization = new Organization("2", "myNewOrg");
        let tomlService = new TomlService();
        jest.spyOn(tomlService, 'fetchToml').mockImplementation( () => tomlOrgObject);
        jest.spyOn(tomlService, 'getOrganization').mockReturnValue( newOrganization);
        let organizationService = new OrganizationService(tomlService);
        let organizations = await organizationService.updateOrganizations([node]);
        expect(organizations).toEqual([newOrganization]);
        expect(node.organizationId).toEqual(newOrganization.id);
    });

    test('ghostOrganization', async () => {
        node.organizationId = "2";
        let newOrganization = new Organization("2", "myNewOrg");
        let tomlService = new TomlService();
        jest.spyOn(tomlService, 'fetchToml').mockImplementation( () => tomlOrgObject);
        jest.spyOn(tomlService, 'getOrganization').mockReturnValue( newOrganization);
        let organizationService = new OrganizationService(tomlService);
        let organizations = await organizationService.updateOrganizations([node]);
        expect(organizations).toEqual([newOrganization]);
        expect(node.organizationId).toEqual(newOrganization.id);
    });
});
