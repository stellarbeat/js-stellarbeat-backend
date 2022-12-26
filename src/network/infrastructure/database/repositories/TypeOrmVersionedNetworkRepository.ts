import { VersionedNetworkRepository } from '../../../domain/VersionedNetworkRepository';
import { VersionedNetwork } from '../../../domain/VersionedNetwork';
import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import { NetworkId } from '../../../domain/NetworkId';
import { Snapshot } from '../../../domain/Snapshot';

@injectable()
@EntityRepository(VersionedNetwork)
export class TypeOrmVersionedNetworkRepository
	extends Repository<VersionedNetwork>
	implements VersionedNetworkRepository
{
	async findOneByNetworkId(
		networkId: NetworkId
	): Promise<VersionedNetwork | undefined> {
		return await this.createQueryBuilder('network')
			.innerJoinAndSelect(
				'network._snapshots',
				'snapshots',
				'snapshots.endDate = :endDate',
				{ endDate: Snapshot.MAX_DATE }
			)
			.where({
				networkId: networkId
			})
			.getOne();
	}
}
