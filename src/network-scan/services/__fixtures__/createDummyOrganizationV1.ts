import { OrganizationV1 } from '@stellarbeat/js-stellarbeat-shared';

export function createDummyOrganizationV1(): OrganizationV1 {
	return {
		id: 'id',
		name: 'name',
		validators: [],
		dba: 'dba',
		url: 'url',
		dateDiscovered: new Date().toISOString(),
		github: 'github',
		twitter: 'twitter',
		logo: 'logo',
		description: 'description',
		homeDomain: 'homeDomain',
		has24HourStats: true,
		has30DayStats: true,
		isTierOneOrganization: true,
		keybase: 'keybase',
		horizonUrl: 'horizonUrl',
		phoneNumber: 'phoneNumber',
		officialEmail: 'officialEmail',
		physicalAddress: 'physicalAddress',
		subQuorum24HoursAvailability: 1,
		subQuorum30DaysAvailability: 1,
		subQuorumAvailable: true,
		tomlState: 'Unknown'
	};
}
