import { MeasurementAggregationRepository } from '../measurement-aggregation/MeasurementAggregationRepository';
import NetworkMeasurementMonth from './NetworkMeasurementMonth';
import { NetworkId } from './NetworkId';

export interface NetworkMeasurementMonthRepository
	extends MeasurementAggregationRepository<NetworkMeasurementMonth> {
	findBetween(
		networkId: NetworkId,
		from: Date,
		to: Date
	): Promise<NetworkMeasurementMonth[]>;

	rollup(fromCrawlId: number, toCrawlId: number): Promise<void>;
}
