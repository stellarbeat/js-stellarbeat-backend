import { Measurement } from './Measurement';

export interface MeasurementRepository<T extends Measurement> {
	findBetween(id: string, from: Date, to: Date): Promise<T[]>;
}
