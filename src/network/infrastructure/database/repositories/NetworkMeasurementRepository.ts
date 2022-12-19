import { Between, EntityRepository, Repository } from 'typeorm';
import { injectable } from 'inversify';
import NetworkMeasurement from '../entities/NetworkMeasurement';
import { MeasurementRepository } from './MeasurementRepository';

@injectable()
@EntityRepository(NetworkMeasurement)
export class NetworkMeasurementRepository
	extends Repository<NetworkMeasurement>
	implements MeasurementRepository
{
	findBetween(id: string, from: Date, to: Date) {
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
