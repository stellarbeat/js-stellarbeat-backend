import { MeasurementAggregationRepository } from './MeasurementAggregationRepository';
import NetworkMeasurementDay from './NetworkMeasurementDay';
import { NetworkMeasurementAggregation } from './NetworkMeasurementAggregation';
import { NetworkId } from '../network/NetworkId';

export interface NetworkMeasurementDayRepository
	extends MeasurementAggregationRepository<NetworkMeasurementAggregation> {
	findBetween(
		id: NetworkId,
		from: Date,
		to: Date
	): Promise<NetworkMeasurementDay[]>;
}
