import { Measurement } from '../database/entities/OrganizationMeasurement';

export interface MeasurementService<> {
	getMeasurements(
		id: string, //todo TrackedEntityId
		from: Date,
		to: Date
	): Promise<Measurement[]>;
}
