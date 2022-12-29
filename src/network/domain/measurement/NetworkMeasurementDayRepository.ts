import { MeasurementRollupRepository } from './MeasurementRollupRepository';
import NetworkMeasurementDay from '../NetworkMeasurementDay';

export interface NetworkMeasurementDayRepository
	extends MeasurementRollupRepository {
	findBetween(from: Date, to: Date): Promise<NetworkMeasurementDay[]>;

	rollup(fromNetworkUpdateId: number, toNetworkUpdateId: number): Promise<void>;
}
