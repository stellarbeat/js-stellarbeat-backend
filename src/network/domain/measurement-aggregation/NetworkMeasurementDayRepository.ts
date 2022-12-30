import { MeasurementAggregationRepository } from './MeasurementAggregationRepository';
import NetworkMeasurementDay from './NetworkMeasurementDay';

export interface NetworkMeasurementDayRepository
	extends MeasurementAggregationRepository {
	findBetween(from: Date, to: Date): Promise<NetworkMeasurementDay[]>;

	rollup(fromNetworkUpdateId: number, toNetworkUpdateId: number): Promise<void>;
}
