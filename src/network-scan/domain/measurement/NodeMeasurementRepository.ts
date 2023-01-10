import { MeasurementRepository } from './MeasurementRepository';
import NodeMeasurement from './NodeMeasurement';
import { NodeMeasurementAverage } from '../measurement-aggregation/NodeMeasurementAverage';
import { NodeMeasurementEvent } from './NodeMeasurementEvent';

export interface NodeMeasurementRepository
	extends MeasurementRepository<NodeMeasurement> {
	findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<NodeMeasurementAverage[]>;
	findEventsForXNetworkUpdates(
		x: number,
		at: Date
	): Promise<NodeMeasurementEvent[]>;
	save(nodeMeasurements: NodeMeasurement[]): Promise<void>;
	findInactiveAt(at: Date): Promise<{ nodeId: number }[]>;
}
