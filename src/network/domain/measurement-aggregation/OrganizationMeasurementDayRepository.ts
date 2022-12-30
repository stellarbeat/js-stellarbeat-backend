import { MeasurementAggregationRepository } from './MeasurementAggregationRepository';
import { OrganizationMeasurementAverage } from './OrganizationMeasurementAverage';
import OrganizationMeasurementDay from './OrganizationMeasurementDay';

export interface OrganizationMeasurementDayRepository
	extends MeasurementAggregationRepository<OrganizationMeasurementDay> {
	findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<OrganizationMeasurementAverage[]>;

	findBetween(
		organizationId: string,
		from: Date,
		to: Date
	): Promise<OrganizationMeasurementDay[]>;
}
