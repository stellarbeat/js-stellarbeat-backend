import { NodeMeasurementAverage } from './NodeMeasurementAverage';
import { MeasurementAggregationRepository } from '../measurement-aggregation/MeasurementAggregationRepository';
import NodeMeasurementDay from './NodeMeasurementDay';
import PublicKey from './PublicKey';

export interface NodeMeasurementDayRepository
	extends MeasurementAggregationRepository<NodeMeasurementDay> {
	findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<NodeMeasurementAverage[]>;

	findBetween(
		publicKey: PublicKey,
		from: Date,
		to: Date
	): Promise<NodeMeasurementDay[]>;

	findXDaysInactive(
		since: Date,
		numberOfDays: number
	): Promise<{ publicKey: string }[]>;

	findXDaysActiveButNotValidating(
		since: Date,
		numberOfDays: number
	): Promise<{ publicKey: string }[]>;
	save(nodeMeasurements: NodeMeasurementDay[]): Promise<void>;
}
