import { MeasurementRollupRepository } from './MeasurementRollupRepository';
import NetworkMeasurementMonth from '../NetworkMeasurementMonth';

export interface NetworkMeasurementMonthRepository
	extends MeasurementRollupRepository {
	findBetween(from: Date, to: Date): Promise<NetworkMeasurementMonth[]>;

	rollup(fromCrawlId: number, toCrawlId: number): Promise<void>;
}
