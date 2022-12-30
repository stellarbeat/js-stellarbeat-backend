import { MeasurementAggregation } from './MeasurementAggregation';
import { MeasurementAggregationSourceId } from './MeasurementAggregationSourceId';

export interface MeasurementAggregationRepository<
	T extends MeasurementAggregation
> {
	rollup(fromNetworkUpdateId: number, toNetworkUpdateId: number): Promise<void>;
	findBetween(
		id: MeasurementAggregationSourceId,
		from: Date,
		to: Date
	): Promise<T[]>;
}
