import Organization from '../Organization';
import { createDummyOrganizationId } from '../__fixtures__/createDummyOrganizationId';
import { OrganizationContactInformation } from '../OrganizationContactInformation';
import { OrganizationValidators } from '../OrganizationValidators';
import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';
import { createDummyNode } from '../../node/__fixtures__/createDummyNode';
import NodeMeasurement from '../../node/NodeMeasurement';

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
		function assertOrganization(organization: Organization) {
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
		}

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
			assertOrganization(organization);
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
			assertOrganization(organization);
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

	describe('isAvailable', () => {
		function createValidator(validating: boolean) {
			const validator1 = createDummyNode();
			const measurement1 = new NodeMeasurement(
				new Date('2020-01-02'),
				validator1
			);
			measurement1.isValidating = validating;
			validator1.addMeasurement(measurement1);
			return validator1;
		}

		test('isAvailable is true', () => {
			const organization = createOrganization();
			const validator1 = createValidator(true);
			const validator2 = createValidator(true);
			const validator3 = createValidator(false);

			organization.updateValidators(
				new OrganizationValidators([
					validator1.publicKey,
					validator2.publicKey,
					validator3.publicKey
				]),
				new Date('2020-01-02')
			);

			organization.updateAvailability(
				[validator1, validator2, validator3],
				new Date('2020-01-02')
			);
			expect(organization.isAvailable()).toBeTruthy();
		});

		test('isAvailable is false', () => {
			const organization = createOrganization();
			const validator1 = createValidator(true);
			const validator2 = createValidator(false);
			const validator3 = createValidator(false);
			organization.updateValidators(
				new OrganizationValidators([
					validator1.publicKey,
					validator2.publicKey,
					validator3.publicKey
				]),
				new Date('2020-01-02')
			);

			const validatorNotPartOfOrganization = createValidator(true);
			organization.updateAvailability(
				[validator1, validator2, validator3, validatorNotPartOfOrganization],
				new Date('2020-01-02')
			);
			expect(organization.isAvailable()).toBeFalsy();
		});
	});

	test('availabilityThreshold', () => {
		const organization = createOrganization();
		expect(organization.availabilityThreshold()).toBe(Number.MAX_SAFE_INTEGER);

		organization.updateValidators(
			new OrganizationValidators([createDummyPublicKey()]),
			new Date('2020-01-02')
		);
		expect(organization.availabilityThreshold()).toBe(1);

		organization.updateValidators(
			new OrganizationValidators([
				createDummyPublicKey(),
				createDummyPublicKey()
			]),
			new Date('2020-01-02')
		);
		expect(organization.availabilityThreshold()).toBe(1);

		organization.updateValidators(
			new OrganizationValidators([
				createDummyPublicKey(),
				createDummyPublicKey(),
				createDummyPublicKey()
			]),
			new Date('2020-01-02')
		);
		expect(organization.availabilityThreshold()).toBe(2);

		organization.updateValidators(
			new OrganizationValidators([
				createDummyPublicKey(),
				createDummyPublicKey(),
				createDummyPublicKey(),
				createDummyPublicKey()
			]),
			new Date('2020-01-02')
		);
		expect(organization.availabilityThreshold()).toBe(2);

		organization.updateValidators(
			new OrganizationValidators([
				createDummyPublicKey(),
				createDummyPublicKey(),
				createDummyPublicKey(),
				createDummyPublicKey(),
				createDummyPublicKey()
			]),
			new Date('2020-01-02')
		);
		expect(organization.availabilityThreshold()).toBe(3);
	});
});

function createOrganization() {
	return Organization.create(
		createDummyOrganizationId(),
		'domain.com',
		new Date('2020-01-01')
	);
}
