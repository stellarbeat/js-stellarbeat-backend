import {Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../../src/entities/CrawlV2";
import OrganizationSnapShotFactory from "../../src/factory/OrganizationSnapShotFactory";
import OrganizationIdStorage from "../../src/entities/OrganizationIdStorage";
import OrganizationSnapShot from "../../src/entities/OrganizationSnapShot";

describe("organization snapshot changed", () => {
    let organization: Organization;
    let organizationSnapShot: OrganizationSnapShot;
    let organizationSnapShotFactory = new OrganizationSnapShotFactory();

    beforeEach(() => {
        organization = new Organization('orgId', 'orgName');
        let storedOrganization = Organization.fromJSON(organization.toJSON());
        organizationSnapShot = organizationSnapShotFactory.create(new OrganizationIdStorage('orgId'), storedOrganization!, new CrawlV2());
    });

    test('no change', () => {
        expect(organizationSnapShot.organizationChanged(organization)).toBeFalsy();
    });

    test('name change', () => {
        organization.name = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('dba change', () => {
        organization.dba = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('url change', () => {
        organization.url = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('mail change', () => {
        organization.officialEmail = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('phone change', () => {
        organization.phoneNumber = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('address change', () => {
        organization.physicalAddress = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('twitter change', () => {
        organization.twitter = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('github change', () => {
        organization.github = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('description change', () => {
        organization.description = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('keybase change', () => {
        organization.keybase = 'other';
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
});
