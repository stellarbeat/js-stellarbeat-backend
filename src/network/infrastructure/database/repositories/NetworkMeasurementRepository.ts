import { Between, EntityRepository, Repository } from 'typeorm';
import { injectable } from 'inversify';
import NetworkMeasurement from '../entities/NetworkMeasurement';

@injectable()
@EntityRepository(NetworkMeasurement)
export class NetworkMeasurementRepository extends Repository<NetworkMeasurement> {
	findBetween(from: Date, to: Date) {
		return this.find({
			where: [
				{
					time: Between(from, to)
				}
			],
			order: { time: 'ASC' }
		});
	}
}
