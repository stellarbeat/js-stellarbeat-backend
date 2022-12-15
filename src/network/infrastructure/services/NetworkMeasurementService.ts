import { MeasurementService } from './MeasurementService';
import { NetworkMeasurementRepository } from '../database/repositories/NetworkMeasurementRepository';
import NetworkMeasurement from '../database/entities/NetworkMeasurement';

export class NetworkMeasurementService
	implements MeasurementService<NetworkMeasurement>
{
	constructor(
		private networkMeasurementRepository: NetworkMeasurementRepository
	) {}

	getMeasurements(
		id: string,
		from: Date,
		to: Date
	): Promise<NetworkMeasurement[]> {
		//id is ignored at the moment, in a future release we will support multiple networks
		return this.networkMeasurementRepository.findBetween(from, to);
	}
}
