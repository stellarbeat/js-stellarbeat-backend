import { Between, Repository } from 'typeorm';
import { injectable } from 'inversify';
import NetworkMeasurement from '../../../domain/network/NetworkMeasurement';
import { NetworkMeasurementRepository } from '../../../domain/network/NetworkMeasurementRepository';

@injectable()
export class TypeOrmNetworkMeasurementRepository
	implements NetworkMeasurementRepository
{
	constructor(private baseRepository: Repository<NetworkMeasurement>) {}

	async save(networkMeasurements: NetworkMeasurement[]): Promise<void> {
		await this.baseRepository.save(networkMeasurements);
	}

	findBetween(id: string, from: Date, to: Date) {
		return this.baseRepository.find({
			where: [
				{
					time: Between(from, to)
				}
			],
			order: { time: 'ASC' }
		});
	}

	async findAllAt(at: Date): Promise<NetworkMeasurement[]> {
		return await this.baseRepository.find({
			where: {
				time: at
			}
		});
	}

	async findAt(id: string, at: Date): Promise<NetworkMeasurement | null> {
		return await this.baseRepository.findOne({
			where: {
				time: at
			}
		});
	}
}
