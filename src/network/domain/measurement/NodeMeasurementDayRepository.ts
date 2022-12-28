import { NodeMeasurementAverage } from './NodeMeasurementAverage';
import VersionedNode from '../VersionedNode';
import { NodeMeasurementV2Statistics } from '../../infrastructure/database/repositories/TypeOrmNodeMeasurementDayRepository';
import { MeasurementRollupRepository } from './MeasurementRollupRepository';

export interface NodeMeasurementDayRepository
	extends MeasurementRollupRepository {
	findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<NodeMeasurementAverage[]>;

	findBetween(
		node: VersionedNode,
		from: Date,
		to: Date
	): Promise<NodeMeasurementV2Statistics[]>;

	findXDaysInactive(
		since: Date,
		numberOfDays: number
	): Promise<{ nodeId: number }[]>;

	findXDaysActiveButNotValidating(
		since: Date,
		numberOfDays: number
	): Promise<{ nodeId: number }[]>;
}
