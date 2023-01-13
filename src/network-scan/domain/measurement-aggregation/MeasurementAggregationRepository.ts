import { MeasurementAggregation } from './MeasurementAggregation';
import { MeasurementAggregationSourceId } from './MeasurementAggregationSourceId';

export interface MeasurementAggregationRepository<
	T extends MeasurementAggregation
> {
	rollup(fromNetworkScanId: number, toNetworkScanId: number): Promise<void>;
	findBetween(
		id: MeasurementAggregationSourceId,
		from: Date,
		to: Date
	): Promise<T[]>;
}
