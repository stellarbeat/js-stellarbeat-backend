import { MeasurementRollupRepository } from './MeasurementRollupRepository';
import { OrganizationMeasurementAverage } from './OrganizationMeasurementAverage';
import VersionedOrganization from '../VersionedOrganization';

export interface OrganizationMeasurementDayRepository
	extends MeasurementRollupRepository {
	findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<OrganizationMeasurementAverage[]>;

	findBetween(
		organization: VersionedOrganization,
		from: Date,
		to: Date
	): Promise<any>;
}
