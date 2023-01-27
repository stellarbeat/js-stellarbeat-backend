import Organization from '../../domain/organization/Organization';
import { createDummyOrganizationId } from '../../domain/organization/__fixtures__/createDummyOrganizationId';
import { OrganizationValidators } from '../../domain/organization/OrganizationValidators';
import { createDummyPublicKey } from '../../domain/node/__fixtures__/createDummyPublicKey';
import { OrganizationContactInformation } from '../../domain/organization/OrganizationContactInformation';
import OrganizationMeasurement from '../../domain/organization/OrganizationMeasurement';
import { OrganizationMapper } from '../OrganizationMapper';
import { OrganizationMeasurementAverage } from '../../domain/organization/OrganizationMeasurementAverage';
import { Snapshot } from '../../../core/domain/Snapshot';

describe('OrganizationMapper', () => {
	test('toOrganizationSnapshotDTO', () => {
		const time = new Date('2020-01-01');
		const organization = Organization.create(
			createDummyOrganizationId(),
			'domain.com',
			time
		);
		const organizationDTO = OrganizationMapper.toOrganizationDTO(organization);

		const organizationSnapshotDTO =
			OrganizationMapper.toOrganizationSnapshotDTO(organization);
		expect(organizationSnapshotDTO.startDate).toEqual(time);
		expect(organizationSnapshotDTO.endDate).toEqual(Snapshot.MAX_DATE);
		expect(organizationSnapshotDTO.organization).toEqual(organizationDTO);
	});

	test('toOrganizationDTO', () => {
		const time = new Date('2020-01-01');
		const organization = Organization.create(
			createDummyOrganizationId(),
			'domain.com',
			time
		);
		organization.updateValidators(
			new OrganizationValidators([createDummyPublicKey()]),
			time
		);
		organization.updateName('name', time);
		organization.updateUrl('url', time);
		organization.updateDescription('description', time);
		organization.updateContactInformation(
			OrganizationContactInformation.create({
				dba: 'dba',
				officialEmail: 'officialEmail',
				phoneNumber: 'phoneNumber',
				physicalAddress: 'physicalAddress',
				twitter: 'twitter',
				github: 'github',
				keybase: 'keybase'
			}),
			time
		);

		const organizationMeasurement = new OrganizationMeasurement(
			time,
			organization
		);
		organizationMeasurement.isSubQuorumAvailable = true;
		organizationMeasurement.index = 1;

		const organization24HourAverage: OrganizationMeasurementAverage = {
			organizationId: organization.organizationId.value,
			isSubQuorumAvailableAvg: 10
		};

		const organization30DayAverage: OrganizationMeasurementAverage = {
			organizationId: organization.organizationId.value,
			isSubQuorumAvailableAvg: 10
		};

		const organizationDTO = OrganizationMapper.toOrganizationDTO(
			organization,
			organizationMeasurement,
			organization24HourAverage,
			organization30DayAverage
		);

		expect(organizationDTO.dba).toEqual(organization.contactInformation.dba);
		expect(organizationDTO.url).toEqual(organization.url);
		expect(organizationDTO.officialEmail).toEqual(
			organization.contactInformation.officialEmail
		);
		expect(organizationDTO.phoneNumber).toEqual(
			organization.contactInformation.phoneNumber
		);
		expect(organizationDTO.physicalAddress).toEqual(
			organization.contactInformation.physicalAddress
		);
		expect(organizationDTO.twitter).toEqual(
			organization.contactInformation.twitter
		);
		expect(organizationDTO.github).toEqual(
			organization.contactInformation.github
		);
		expect(organizationDTO.keybase).toEqual(
			organization.contactInformation.keybase
		);
		expect(organizationDTO.name).toEqual(organization.name);
		expect(organizationDTO.description).toEqual(organization.description);
		expect(organizationDTO.homeDomain).toEqual(organization.homeDomain);
		expect(organizationDTO.subQuorumAvailable).toEqual(
			organizationMeasurement.isSubQuorumAvailable
		);
		expect(organizationDTO.has24HourStats).toBeTruthy();
		expect(organizationDTO.subQuorum24HoursAvailability).toEqual(
			organization24HourAverage.isSubQuorumAvailableAvg
		);
		expect(organizationDTO.has30DayStats).toBeTruthy();
		expect(organizationDTO.subQuorum30DaysAvailability).toEqual(
			organization30DayAverage.isSubQuorumAvailableAvg
		);
		expect(organizationDTO.validators).toEqual(
			organization.validators.value.map((validator) => validator.value)
		);
		expect(organizationDTO.dateDiscovered).toEqual(organization.dateDiscovered);
	});
});
