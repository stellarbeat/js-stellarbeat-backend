import {
	OrganizationSnapshotV1,
	OrganizationV1
} from '@stellarbeat/js-stellarbeat-shared';
import { OrganizationMeasurementAverage } from '../domain/organization/OrganizationMeasurementAverage';
import Organization from '../domain/organization/Organization';
import { injectable } from 'inversify';
import 'reflect-metadata';
import { TierOneCandidatePolicy } from '../domain/organization/TierOneCandidatePolicy';

@injectable()
export class OrganizationV1DTOMapper {
	toOrganizationV1DTO(
		organization: Organization,
		measurement24HourAverage?: OrganizationMeasurementAverage,
		measurement30DayAverage?: OrganizationMeasurementAverage
	): OrganizationV1 {
		return {
			id: organization.organizationId.value,
			name: organization.name,
			dateDiscovered: organization.dateDiscovered.toISOString(),
			dba: organization.contactInformation.dba,
			url: organization.url,
			officialEmail: organization.contactInformation.officialEmail,
			phoneNumber: organization.contactInformation.phoneNumber,
			physicalAddress: organization.contactInformation.physicalAddress,
			twitter: organization.contactInformation.twitter,
			github: organization.contactInformation.github,
			description: organization.description,
			keybase: organization.contactInformation.keybase,
			horizonUrl: organization.horizonUrl,
			homeDomain: organization.homeDomain,
			validators: organization.validators.value.map(
				(validator) => validator.value
			),
			subQuorumAvailable: organization.isAvailable(),
			has24HourStats: measurement24HourAverage !== undefined,
			subQuorum24HoursAvailability:
				measurement24HourAverage?.isSubQuorumAvailableAvg || 0,
			has30DayStats: measurement30DayAverage !== undefined,
			subQuorum30DaysAvailability:
				measurement30DayAverage?.isSubQuorumAvailableAvg || 0,
			isTierOneOrganization: TierOneCandidatePolicy.isTierOneCandidate(
				organization,
				measurement30DayAverage
			),
			logo: null,
			tomlState: organization.latestMeasurement()?.tomlState ?? 'Unknown'
		};
	}

	toOrganizationSnapshotV1DTO(
		organization: Organization
	): OrganizationSnapshotV1 {
		return {
			startDate: organization.snapshotStartDate.toISOString(),
			endDate: organization.snapshotEndDate.toISOString(),
			organization: this.toOrganizationV1DTO(organization)
		};
	}
}
