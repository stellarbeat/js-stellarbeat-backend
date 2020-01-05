import {Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../../src/entities/CrawlV2";
import OrganizationSnapShotFactory from "../../src/factory/OrganizationSnapShotFactory";
import OrganizationIdStorage from "../../src/entities/OrganizationIdStorage";
import OrganizationSnapShot from "../../src/entities/OrganizationSnapShot";
import NodePublicKeyStorage from "../../src/entities/NodePublicKeyStorage";

describe("organization snapshot changed", () => {
    let organization: Organization;
    let organizationSnapShot: OrganizationSnapShot;
    let organizationSnapShotFactory = new OrganizationSnapShotFactory();

    beforeEach(() => {
        organization = new Organization('orgId', 'orgName');
        organizationSnapShot = organizationSnapShotFactory.create(new OrganizationIdStorage('orgId', new Date()), organization, new CrawlV2(), []);
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

    test('validator added', () => {
        organization.validators.push('A');
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('validator removed', () => {
        organizationSnapShot.validators = [];
        organizationSnapShot.validators.push(new NodePublicKeyStorage('A'));
        expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
    });
    test('validator different order, no change', () => {
        organization.validators.push('A');
        organization.validators.push('B');
        organization.validators.push('C');
        organization.validators.push('D');
        organization.validators.push('E');
        organizationSnapShot.validators = [];
        organizationSnapShot.validators.push(new NodePublicKeyStorage('C'));
        organizationSnapShot.validators.push(new NodePublicKeyStorage('D'));
        organizationSnapShot.validators.push(new NodePublicKeyStorage('B'));
        organizationSnapShot.validators.push(new NodePublicKeyStorage('E'));
        organizationSnapShot.validators.push(new NodePublicKeyStorage('A'));

        expect(organizationSnapShot.organizationChanged(organization)).toBeFalsy();
    });
});
