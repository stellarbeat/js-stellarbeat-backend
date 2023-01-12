import {
	EntityRepository,
	LessThan,
	LessThanOrEqual,
	Repository
} from 'typeorm';
import NetworkUpdate from '../../../domain/network/scan/NetworkUpdate';
import { injectable } from 'inversify';
import { NetworkUpdateRepository } from '../../../domain/network/scan/NetworkUpdateRepository';

@injectable()
@EntityRepository(NetworkUpdate)
export class TypeOrmNetworkUpdateRepository
	extends Repository<NetworkUpdate>
	implements NetworkUpdateRepository
{
	async findLatest(): Promise<NetworkUpdate | undefined> {
		return await this.findOne({
			where: {
				completed: true
			}
		});
	}

	async findAt(at: Date): Promise<NetworkUpdate | undefined> {
		return this.findOne({
			where: { time: LessThanOrEqual(at), completed: true },
			order: { time: 'DESC' }
		});
	}

	findPreviousAt(at: Date): Promise<NetworkUpdate | undefined> {
		return this.findOne({
			where: { time: LessThan(at), completed: true },
			order: { time: 'DESC' }
		});
	}
}
