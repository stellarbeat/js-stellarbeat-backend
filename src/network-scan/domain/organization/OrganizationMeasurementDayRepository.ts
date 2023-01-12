import { MeasurementAggregationRepository } from '../measurement-aggregation/MeasurementAggregationRepository';
import { OrganizationMeasurementAverage } from './OrganizationMeasurementAverage';
import OrganizationMeasurementDay from './OrganizationMeasurementDay';
import { OrganizationId } from './OrganizationId';

export interface OrganizationMeasurementDayRepository
	extends MeasurementAggregationRepository<OrganizationMeasurementDay> {
	findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<OrganizationMeasurementAverage[]>;

	findBetween(
		organizationId: OrganizationId,
		from: Date,
		to: Date
	): Promise<OrganizationMeasurementDay[]>;
}
