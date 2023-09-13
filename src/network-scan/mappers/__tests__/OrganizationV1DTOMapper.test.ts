import Organization from '../../domain/organization/Organization';
import { createDummyOrganizationId } from '../../domain/organization/__fixtures__/createDummyOrganizationId';
import { OrganizationValidators } from '../../domain/organization/OrganizationValidators';
import { createDummyPublicKey } from '../../domain/node/__fixtures__/createDummyPublicKey';
import { OrganizationContactInformation } from '../../domain/organization/OrganizationContactInformation';
import OrganizationMeasurement from '../../domain/organization/OrganizationMeasurement';
import { OrganizationMeasurementAverage } from '../../domain/organization/OrganizationMeasurementAverage';
import { OrganizationV1DTOMapper } from '../OrganizationV1DTOMapper';
import { TomlState } from '../../domain/organization/scan/TomlState';

describe('OrganizationV1DTOMapper', () => {
	test('toOrganizationDTO', () => {
		const {
			organization,
			organizationMeasurement,
			organization24HourAverage,
			organization30DayAverage
		} = createOrganization();

		const organizationV1DTO = new OrganizationV1DTOMapper().toOrganizationV1DTO(
			organization,
			organization24HourAverage,
			organization30DayAverage
		);

		expect(organizationV1DTO.dba).toEqual(organization.contactInformation.dba);
		expect(organizationV1DTO.url).toEqual(organization.url);
		expect(organizationV1DTO.officialEmail).toEqual(
			organization.contactInformation.officialEmail
		);
		expect(organizationV1DTO.phoneNumber).toEqual(
			organization.contactInformation.phoneNumber
		);
		expect(organizationV1DTO.physicalAddress).toEqual(
			organization.contactInformation.physicalAddress
		);
		expect(organizationV1DTO.twitter).toEqual(
			organization.contactInformation.twitter
		);
		expect(organizationV1DTO.github).toEqual(
			organization.contactInformation.github
		);
		expect(organizationV1DTO.keybase).toEqual(
			organization.contactInformation.keybase
		);
		expect(organizationV1DTO.name).toEqual(organization.name);
		expect(organizationV1DTO.description).toEqual(organization.description);
		expect(organizationV1DTO.homeDomain).toEqual(organization.homeDomain);
		expect(organizationV1DTO.subQuorumAvailable).toEqual(
			organizationMeasurement.isSubQuorumAvailable
		);
		expect(organizationV1DTO.has24HourStats).toBeTruthy();
		expect(organizationV1DTO.subQuorum24HoursAvailability).toEqual(
			organization24HourAverage.isSubQuorumAvailableAvg
		);
		expect(organizationV1DTO.has30DayStats).toBeTruthy();
		expect(organizationV1DTO.subQuorum30DaysAvailability).toEqual(
			organization30DayAverage.isSubQuorumAvailableAvg
		);
		expect(organizationV1DTO.validators).toEqual(
			organization.validators.value.map((validator) => validator.value)
		);
		expect(organizationV1DTO.dateDiscovered).toEqual(
			organization.dateDiscovered.toISOString()
		);
		expect(organizationV1DTO.tomlState).toEqual(TomlState.Ok);
	});
	test('toOrganizationSnapshotV1DTO', () => {
		const { organization } = createOrganization();

		const organizationV1DTO = new OrganizationV1DTOMapper().toOrganizationV1DTO(
			organization
		);

		const organizationSnapshotV1DTO =
			new OrganizationV1DTOMapper().toOrganizationSnapshotV1DTO(organization);

		expect(organizationSnapshotV1DTO.startDate).toEqual(
			organization.snapshotStartDate.toISOString()
		);
		expect(organizationSnapshotV1DTO.endDate).toEqual(
			organization.snapshotEndDate.toISOString()
		);
		expect(organizationSnapshotV1DTO.organization).toEqual(organizationV1DTO);
	});
	function createOrganization() {
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
		organization.updateAvailability([], time);

		const organizationMeasurement = new OrganizationMeasurement(
			time,
			organization
		);
		organizationMeasurement.isSubQuorumAvailable = true;
		organizationMeasurement.index = 1;
		organizationMeasurement.tomlState = TomlState.Ok;
		organization.addMeasurement(organizationMeasurement);

		const organization24HourAverage: OrganizationMeasurementAverage = {
			organizationId: organization.organizationId.value,
			isSubQuorumAvailableAvg: 10
		};

		const organization30DayAverage: OrganizationMeasurementAverage = {
			organizationId: organization.organizationId.value,
			isSubQuorumAvailableAvg: 10
		};
		return {
			organization,
			organizationMeasurement,
			organization24HourAverage,
			organization30DayAverage
		};
	}
});
