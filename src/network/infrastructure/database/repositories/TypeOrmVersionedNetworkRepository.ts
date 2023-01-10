import { NetworkRepository } from '../../../domain/network/NetworkRepository';
import { Network } from '../../../domain/network/Network';
import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import { NetworkId } from '../../../domain/network/NetworkId';
import { Snapshot } from '../../../../core/domain/Snapshot';

@injectable()
@EntityRepository(Network)
export class TypeOrmVersionedNetworkRepository
	extends Repository<Network>
	implements NetworkRepository
{
	async findOneByNetworkId(networkId: NetworkId): Promise<Network | undefined> {
		return await this.createQueryBuilder('network')
			.innerJoinAndSelect(
				'network._snapshots',
				'snapshots',
				'snapshots.endDate = :endDate',
				{ endDate: Snapshot.MAX_DATE }
			)
			.innerJoinAndSelect('network._changes', 'changes', '', {
				limit: 10
			})
			.where({
				networkId: networkId
			})
			.getOne();
	}
}
