import { NodeMeasurementAverage } from './NodeMeasurementAverage';
import VersionedNode from '../VersionedNode';
import { NodeMeasurementV2Statistics } from '../../infrastructure/database/repositories/TypeOrmNodeMeasurementDayRepository';
import { MeasurementAggregationRepository } from './MeasurementAggregationRepository';
import NodeMeasurementDay from './NodeMeasurementDay';
import PublicKey from '../PublicKey';

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
	): Promise<{ nodeId: number }[]>;

	findXDaysActiveButNotValidating(
		since: Date,
		numberOfDays: number
	): Promise<{ nodeId: number }[]>;
	save(nodeMeasurements: NodeMeasurementDay[]): Promise<void>;
}
