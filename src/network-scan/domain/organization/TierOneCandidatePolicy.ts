import { OrganizationMeasurementAverage } from './OrganizationMeasurementAverage';
import Organization from './Organization';

export class TierOneCandidatePolicy {
	static isTierOneCandidate(
		organization: Organization,
		measurement30DayAverage?: OrganizationMeasurementAverage
	): boolean {
		if (!measurement30DayAverage) return false;
		return (
			measurement30DayAverage.isSubQuorumAvailableAvg >= 99 &&
			organization.validators.value.length >= 3
		);
	}
}
