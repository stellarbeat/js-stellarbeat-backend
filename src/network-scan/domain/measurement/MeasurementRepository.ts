import { Measurement } from './Measurement';

export interface MeasurementRepository<T extends Measurement> {
	findBetween(id: string, from: Date, to: Date): Promise<T[]>;
	findAt(id: string, at: Date): Promise<T | null>;
	findAllAt(at: Date): Promise<T[]>;
}
