import { MeasurementAggregationRepository } from './MeasurementAggregationRepository';
import NetworkMeasurementMonth from './NetworkMeasurementMonth';
import { NetworkId } from '../network/NetworkId';

export interface NetworkMeasurementMonthRepository
	extends MeasurementAggregationRepository<NetworkMeasurementMonth> {
	findBetween(
		networkId: NetworkId,
		from: Date,
		to: Date
	): Promise<NetworkMeasurementMonth[]>;

	rollup(fromCrawlId: number, toCrawlId: number): Promise<void>;
}
