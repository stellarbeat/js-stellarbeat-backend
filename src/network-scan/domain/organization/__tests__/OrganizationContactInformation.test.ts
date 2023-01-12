import {
	OrganizationContactInformation,
	OrganizationContactInformationProps
} from '../OrganizationContactInformation';

describe('OrganizationContactInformation', () => {
	it('should equal', function () {
		const organizationContactInformation =
			OrganizationContactInformation.create(
				createOrganizationContactInformationProps()
			);
		const other = OrganizationContactInformation.create(
			createOrganizationContactInformationProps()
		);
		expect(organizationContactInformation.equals(other)).toBe(true);
	});

	it('should not equal', function () {
		const organizationContactInformation =
			OrganizationContactInformation.create(
				createOrganizationContactInformationProps()
			);
		let otherProps = createOrganizationContactInformationProps();
		otherProps.dba = 'otherDba';
		let other = OrganizationContactInformation.create(otherProps);
		expect(organizationContactInformation.equals(other)).toBe(false);
		otherProps = createOrganizationContactInformationProps();
		otherProps.officialEmail = 'otherOfficialEmail';
		other = OrganizationContactInformation.create(otherProps);
		expect(organizationContactInformation.equals(other)).toBe(false);
		otherProps = createOrganizationContactInformationProps();
		otherProps.phoneNumber = 'otherPhoneNumber';
		other = OrganizationContactInformation.create(otherProps);
		expect(organizationContactInformation.equals(other)).toBe(false);
		otherProps = createOrganizationContactInformationProps();
		otherProps.physicalAddress = 'otherPhysicalAddress';
		other = OrganizationContactInformation.create(otherProps);
		expect(organizationContactInformation.equals(other)).toBe(false);
		otherProps = createOrganizationContactInformationProps();
		otherProps.twitter = 'otherTwitter';
		other = OrganizationContactInformation.create(otherProps);
		expect(organizationContactInformation.equals(other)).toBe(false);
		otherProps = createOrganizationContactInformationProps();
		otherProps.github = 'otherGithub';
		other = OrganizationContactInformation.create(otherProps);
		expect(organizationContactInformation.equals(other)).toBe(false);
		otherProps = createOrganizationContactInformationProps();
		otherProps.keybase = 'otherKeybase';
		other = OrganizationContactInformation.create(otherProps);
		expect(organizationContactInformation.equals(other)).toBe(false);
	});
});

function createOrganizationContactInformationProps(): OrganizationContactInformationProps {
	return {
		dba: 'dba',
		officialEmail: 'officialEmail',
		phoneNumber: 'phoneNumber',
		physicalAddress: 'physicalAddress',
		twitter: 'twitter',
		github: 'github',
		keybase: 'keybase'
	};
}
