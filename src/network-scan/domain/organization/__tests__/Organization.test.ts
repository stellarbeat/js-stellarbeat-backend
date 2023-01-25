import Organization from '../Organization';
import { createDummyOrganizationId } from '../__fixtures__/createDummyOrganizationId';
import { OrganizationContactInformation } from '../OrganizationContactInformation';
import { OrganizationValidators } from '../OrganizationValidators';
import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';

describe('Organization', () => {
	describe('name changes', () => {
		test('name is updated', () => {
			const organization = createOrganization();
			organization.updateName('new name', new Date('2020-01-02'));
			expect(organization.name).toBe('new name');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
		test('name not updated if same name', () => {
			const organization = createOrganization();
			organization.updateName('name', new Date('2020-01-02'));
			organization.updateName('name', new Date('2020-01-03'));
			expect(organization.name).toBe('name');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('contact information changes', () => {
		test('contact information is updated', () => {
			const organization = createOrganization();
			organization.updateContactInformation(
				OrganizationContactInformation.create({
					twitter: 'twitter',
					github: 'github',
					keybase: 'keybase',
					physicalAddress: 'physicalAddress',
					dba: 'dba',
					officialEmail: 'officialEmail',
					phoneNumber: 'phoneNumber'
				}),
				new Date('2020-01-02')
			);
			expect(organization.contactInformation.twitter).toBe('twitter');
			expect(organization.contactInformation.github).toBe('github');
			expect(organization.contactInformation.keybase).toBe('keybase');
			expect(organization.contactInformation.physicalAddress).toBe(
				'physicalAddress'
			);
			expect(organization.contactInformation.dba).toBe('dba');
			expect(organization.contactInformation.officialEmail).toBe(
				'officialEmail'
			);
			expect(organization.contactInformation.phoneNumber).toBe('phoneNumber');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
		test('contact information not updated if same contact information', () => {
			const organization = createOrganization();
			organization.updateContactInformation(
				OrganizationContactInformation.create({
					twitter: 'twitter',
					github: 'github',
					keybase: 'keybase',
					physicalAddress: 'physicalAddress',
					dba: 'dba',
					officialEmail: 'officialEmail',
					phoneNumber: 'phoneNumber'
				}),
				new Date('2020-01-02')
			);
			organization.updateContactInformation(
				OrganizationContactInformation.create({
					twitter: 'twitter',
					github: 'github',
					keybase: 'keybase',
					physicalAddress: 'physicalAddress',
					dba: 'dba',
					officialEmail: 'officialEmail',
					phoneNumber: 'phoneNumber'
				}),
				new Date('2020-01-03')
			);
			expect(organization.contactInformation.twitter).toBe('twitter');
			expect(organization.contactInformation.github).toBe('github');
			expect(organization.contactInformation.keybase).toBe('keybase');
			expect(organization.contactInformation.physicalAddress).toBe(
				'physicalAddress'
			);
			expect(organization.contactInformation.dba).toBe('dba');
			expect(organization.contactInformation.officialEmail).toBe(
				'officialEmail'
			);
			expect(organization.contactInformation.phoneNumber).toBe('phoneNumber');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('url changes', () => {
		test('url is updated', () => {
			const organization = createOrganization();
			organization.updateUrl('new url', new Date('2020-01-02'));
			expect(organization.url).toBe('new url');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
		test('url not updated if same url', () => {
			const organization = createOrganization();
			organization.updateUrl('url', new Date('2020-01-02'));
			organization.updateUrl('url', new Date('2020-01-03'));
			expect(organization.url).toBe('url');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('description changes', () => {
		test('description is updated', () => {
			const organization = createOrganization();
			organization.updateDescription('new description', new Date('2020-01-02'));
			expect(organization.description).toBe('new description');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
		test('description not updated if same description', () => {
			const organization = createOrganization();
			organization.updateDescription('description', new Date('2020-01-02'));
			organization.updateDescription('description', new Date('2020-01-03'));
			expect(organization.description).toBe('description');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('horizonUrl changes', () => {
		test('horizonUrl is updated', () => {
			const organization = createOrganization();
			organization.updateHorizonUrl('new horizonUrl', new Date('2020-01-02'));
			expect(organization.horizonUrl).toBe('new horizonUrl');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
		test('horizonUrl not updated if same horizonUrl', () => {
			const organization = createOrganization();
			organization.updateHorizonUrl('horizonUrl', new Date('2020-01-02'));
			organization.updateHorizonUrl('horizonUrl', new Date('2020-01-03'));
			expect(organization.horizonUrl).toBe('horizonUrl');
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('validators changes', () => {
		test('validators is updated', () => {
			const organization = createOrganization();
			const validators = new OrganizationValidators([createDummyPublicKey()]);
			organization.updateValidators(validators, new Date('2020-01-02'));
			expect(organization.validators.equals(validators)).toBeTruthy();
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});

		test('validators not updated if same validators', () => {
			const organization = createOrganization();
			const validators = new OrganizationValidators([createDummyPublicKey()]);
			organization.updateValidators(validators, new Date('2020-01-02'));
			organization.updateValidators(validators, new Date('2020-01-03'));
			expect(organization.validators.equals(validators)).toBeTruthy();
			expect(organization.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});
});

function createOrganization() {
	return Organization.create(
		createDummyOrganizationId(),
		new Date('2020-01-01')
	);
}
