import { MeasurementAggregationRepository } from '../measurement-aggregation/MeasurementAggregationRepository';
import NetworkMeasurementDay from './NetworkMeasurementDay';
import { NetworkMeasurementAggregation } from './NetworkMeasurementAggregation';
import { NetworkId } from './NetworkId';

export interface NetworkMeasurementDayRepository
	extends MeasurementAggregationRepository<NetworkMeasurementAggregation> {
	findBetween(
		id: NetworkId,
		from: Date,
		to: Date
	): Promise<NetworkMeasurementDay[]>;
}
