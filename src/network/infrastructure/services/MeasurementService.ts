import { Measurement } from '../database/entities/OrganizationMeasurement';

export interface MeasurementService<T extends Measurement> {
	getMeasurements(
		id: string, //todo TrackedEntityId
		from: Date,
		to: Date
	): Promise<T[]>;
}
