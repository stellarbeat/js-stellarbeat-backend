import { Organization } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotFactory from '../../snapshotting/factory/OrganizationSnapShotFactory';
import OrganizationId from '../../../../domain/OrganizationId';
import OrganizationSnapShot from '../OrganizationSnapShot';
import PublicKey from '../../../../domain/PublicKey';

describe('organization snapshot changed', () => {
	let organization: Organization;
	let organizationSnapShot: OrganizationSnapShot;
	const organizationSnapShotFactory = new OrganizationSnapShotFactory();

	beforeEach(() => {
		organization = new Organization('orgId', 'orgName');
		organizationSnapShot = organizationSnapShotFactory.create(
			new OrganizationId('orgId', new Date()),
			organization,
			new Date(),
			[]
		);
	});

	test('no change', () => {
		expect(organizationSnapShot.organizationChanged(organization)).toBeFalsy();
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
		organizationSnapShot.validators.push(new PublicKey('A'));
		expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
	});
	test('validator different order, no change', () => {
		organization.validators.push('A');
		organization.validators.push('B');
		organization.validators.push('C');
		organization.validators.push('D');
		organization.validators.push('E');
		organizationSnapShot.validators = [];
		organizationSnapShot.validators.push(new PublicKey('C'));
		organizationSnapShot.validators.push(new PublicKey('D'));
		organizationSnapShot.validators.push(new PublicKey('B'));
		organizationSnapShot.validators.push(new PublicKey('E'));
		organizationSnapShot.validators.push(new PublicKey('A'));

		expect(organizationSnapShot.organizationChanged(organization)).toBeFalsy();
	});
});
