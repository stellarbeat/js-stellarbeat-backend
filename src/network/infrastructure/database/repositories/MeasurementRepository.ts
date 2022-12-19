import { Measurement } from '../entities/OrganizationMeasurement';

//todo: move to domain
export interface MeasurementRepository {
	findBetween(id: string, from: Date, to: Date): Promise<Measurement[]>;
}
