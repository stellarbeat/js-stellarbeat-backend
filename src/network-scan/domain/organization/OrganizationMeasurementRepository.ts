import { MeasurementRepository } from '../measurement/MeasurementRepository';
import OrganizationMeasurement from './OrganizationMeasurement';
import { OrganizationMeasurementAverage } from './OrganizationMeasurementAverage';
import { OrganizationMeasurementEvent } from './OrganizationMeasurementEvent';

export interface OrganizationMeasurementRepository
	extends MeasurementRepository<OrganizationMeasurement> {
	findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<OrganizationMeasurementAverage[]>;
	findEventsForXNetworkScans(
		x: number,
		at: Date
	): Promise<OrganizationMeasurementEvent[]>;
	save(organizationMeasurements: OrganizationMeasurement[]): Promise<void>;
}
