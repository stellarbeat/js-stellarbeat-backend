import { Organization } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotFactory from '../snapshotting/OrganizationSnapShotFactory';
import VersionedOrganization from '../VersionedOrganization';
import OrganizationSnapShot from '../OrganizationSnapShot';
import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';
import VersionedNode from '../../node/VersionedNode';
import { createDummyOrganizationId } from '../__fixtures__/createDummyOrganizationId';

describe('organization snapshot changed', () => {
	let organization: Organization;
	let organizationSnapShot: OrganizationSnapShot;
	const organizationSnapShotFactory = new OrganizationSnapShotFactory();

	beforeEach(() => {
		const organizationId = createDummyOrganizationId();
		organization = new Organization(organizationId.value, 'orgName');
		organizationSnapShot = organizationSnapShotFactory.create(
			new VersionedOrganization(organizationId, new Date()),
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
		organizationSnapShot.validators.push(
			new VersionedNode(createDummyPublicKey())
		);
		expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
	});
	test('validator different order, no change', () => {
		const a = new VersionedNode(createDummyPublicKey());
		const b = new VersionedNode(createDummyPublicKey());
		const c = new VersionedNode(createDummyPublicKey());
		const d = new VersionedNode(createDummyPublicKey());
		const e = new VersionedNode(createDummyPublicKey());
		organization.validators.push(a.publicKey.value);
		organization.validators.push(b.publicKey.value);
		organization.validators.push(c.publicKey.value);
		organization.validators.push(d.publicKey.value);
		organization.validators.push(e.publicKey.value);
		organizationSnapShot.validators = [];
		organizationSnapShot.validators.push(c);
		organizationSnapShot.validators.push(d);
		organizationSnapShot.validators.push(b);
		organizationSnapShot.validators.push(e);
		organizationSnapShot.validators.push(a);

		expect(organizationSnapShot.organizationChanged(organization)).toBeFalsy();
	});
});
