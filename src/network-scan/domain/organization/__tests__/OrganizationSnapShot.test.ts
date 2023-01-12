import { Organization as OrganizationDTO } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotFactory from '../snapshotting/OrganizationSnapShotFactory';
import Organization from '../Organization';
import OrganizationSnapShot from '../OrganizationSnapShot';
import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';
import Node from '../../node/Node';
import { createDummyOrganizationId } from '../__fixtures__/createDummyOrganizationId';

describe('OrganizationSnapshot', () => {});

describe('organization snapshot changed LEGACY', () => {
	let organization: OrganizationDTO;
	let organizationSnapShot: OrganizationSnapShot;
	const organizationSnapShotFactory = new OrganizationSnapShotFactory();

	beforeEach(() => {
		const organizationId = createDummyOrganizationId();
		organization = new OrganizationDTO(organizationId.value, 'orgName');
		organizationSnapShot = organizationSnapShotFactory.create(
			new Organization(organizationId, new Date()),
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
		organizationSnapShot.validators.push(new Node(createDummyPublicKey()));
		expect(organizationSnapShot.organizationChanged(organization)).toBeTruthy();
	});
	test('validator different order, no change', () => {
		const a = new Node(createDummyPublicKey());
		const b = new Node(createDummyPublicKey());
		const c = new Node(createDummyPublicKey());
		const d = new Node(createDummyPublicKey());
		const e = new Node(createDummyPublicKey());
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
