import { MeasurementAggregationRepository } from './MeasurementAggregationRepository';
import NetworkMeasurementMonth from './NetworkMeasurementMonth';

export interface NetworkMeasurementMonthRepository
	extends MeasurementAggregationRepository {
	findBetween(from: Date, to: Date): Promise<NetworkMeasurementMonth[]>;

	rollup(fromCrawlId: number, toCrawlId: number): Promise<void>;
}
