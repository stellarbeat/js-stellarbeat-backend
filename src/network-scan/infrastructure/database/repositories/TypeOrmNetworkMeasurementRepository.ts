import { Between, EntityRepository, Repository } from 'typeorm';
import { injectable } from 'inversify';
import NetworkMeasurement from '../../../domain/measurement/NetworkMeasurement';
import { NetworkMeasurementRepository } from '../../../domain/measurement/NetworkMeasurementRepository';

@injectable()
@EntityRepository(NetworkMeasurement)
export class TypeOrmNetworkMeasurementRepository
	extends Repository<NetworkMeasurement>
	implements NetworkMeasurementRepository
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

	async findAllAt(at: Date): Promise<NetworkMeasurement[]> {
		return await this.find({
			where: {
				time: at
			}
		});
	}

	async findAt(id: string, at: Date): Promise<NetworkMeasurement | undefined> {
		return await this.findOne({
			where: {
				time: at
			}
		});
	}
}
