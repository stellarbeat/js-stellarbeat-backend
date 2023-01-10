import { MeasurementRepository } from './MeasurementRepository';
import NetworkMeasurement from './NetworkMeasurement';

export interface NetworkMeasurementRepository
	extends MeasurementRepository<NetworkMeasurement> {
	save(networkMeasurements: NetworkMeasurement[]): Promise<void>;
}
