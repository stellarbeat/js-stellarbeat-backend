import {
	EntityRepository,
	LessThan,
	LessThanOrEqual,
	Repository
} from 'typeorm';
import NetworkScan from '../../../domain/network/scan/NetworkScan';
import { injectable } from 'inversify';
import { NetworkScanRepository } from '../../../domain/network/scan/NetworkScanRepository';

@injectable()
@EntityRepository(NetworkScan)
export class TypeOrmNetworkScanRepository
	extends Repository<NetworkScan>
	implements NetworkScanRepository
{
	async findLatest(): Promise<NetworkScan | undefined> {
		return await this.findOne({
			where: {
				completed: true
			}
		});
	}

	async findAt(at: Date): Promise<NetworkScan | undefined> {
		return this.findOne({
			where: { time: LessThanOrEqual(at), completed: true },
			order: { time: 'DESC' }
		});
	}

	findPreviousAt(at: Date): Promise<NetworkScan | undefined> {
		return this.findOne({
			where: { time: LessThan(at), completed: true },
			order: { time: 'DESC' }
		});
	}
}
