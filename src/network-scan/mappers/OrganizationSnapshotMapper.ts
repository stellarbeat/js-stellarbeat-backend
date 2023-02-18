import { Organization as OrganizationDTO } from '@stellarbeat/js-stellarbeat-shared';
import OrganizationMeasurement from '../domain/organization/OrganizationMeasurement';
import { OrganizationMeasurementAverage } from '../domain/organization/OrganizationMeasurementAverage';
import { OrganizationSnapShot as DomainOrganizationSnapShot } from '@stellarbeat/js-stellarbeat-shared/lib/organization-snap-shot';
import OrganizationSnapShot from '../domain/organization/OrganizationSnapShot';

//@deprecated
export class OrganizationSnapshotMapper {
	static toOrganizationDTO(
		organizationSnapshot: OrganizationSnapShot,
		measurement?: OrganizationMeasurement,
		measurement24HourAverage?: OrganizationMeasurementAverage,
		measurement30DayAverage?: OrganizationMeasurementAverage
	): OrganizationDTO {
		const organization = new OrganizationDTO(
			organizationSnapshot.organization.organizationId.value,
			organizationSnapshot.name || ''
		);

		organization.dateDiscovered =
			organizationSnapshot.organization.dateDiscovered;
		organization.dba = organizationSnapshot.contactInformation.dba;
		organization.url = organizationSnapshot.url;
		organization.officialEmail =
			organizationSnapshot.contactInformation.officialEmail;
		organization.phoneNumber =
			organizationSnapshot.contactInformation.phoneNumber;
		organization.physicalAddress =
			organizationSnapshot.contactInformation.physicalAddress;
		organization.twitter = organizationSnapshot.contactInformation.twitter;
		organization.github = organizationSnapshot.contactInformation.github;
		organization.description = organizationSnapshot.description;
		organization.keybase = organizationSnapshot.contactInformation.keybase;
		organization.horizonUrl = organizationSnapshot.horizonUrl;
		organization.homeDomain = organizationSnapshot.organization.homeDomain;

		organizationSnapshot.validators.value.forEach((validator) => {
			organization.validators.push(validator.value);
		});

		if (measurement) {
			organization.subQuorumAvailable = measurement.isSubQuorumAvailable;
		}

		if (measurement24HourAverage) {
			organization.has24HourStats = true;
			organization.subQuorum24HoursAvailability =
				measurement24HourAverage.isSubQuorumAvailableAvg;
		}

		if (measurement30DayAverage) {
			organization.has30DayStats = true;
			organization.subQuorum30DaysAvailability =
				measurement30DayAverage.isSubQuorumAvailableAvg;
		}

		return organization;
	}

	static toOrganizationSnapshotDTO(
		organizationSnapshot: OrganizationSnapShot
	): DomainOrganizationSnapShot {
		return new DomainOrganizationSnapShot(
			organizationSnapshot.startDate,
			organizationSnapshot.endDate,
			OrganizationSnapshotMapper.toOrganizationDTO(organizationSnapshot)
		);
	}
}
