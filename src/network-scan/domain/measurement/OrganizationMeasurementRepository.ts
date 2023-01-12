import { MeasurementRepository } from './MeasurementRepository';
import OrganizationMeasurement from './OrganizationMeasurement';
import { OrganizationMeasurementAverage } from '../measurement-aggregation/OrganizationMeasurementAverage';
import { OrganizationMeasurementEvent } from './OrganizationMeasurementEvent';

export interface OrganizationMeasurementRepository
	extends MeasurementRepository<OrganizationMeasurement> {
	findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<OrganizationMeasurementAverage[]>;
	findEventsForXNetworkUpdates(
		x: number,
		at: Date
	): Promise<OrganizationMeasurementEvent[]>;
	save(organizationMeasurements: OrganizationMeasurement[]): Promise<void>;
}