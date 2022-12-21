import { VersionedNetworkRepository } from '../../../domain/VersionedNetworkRepository';
import { VersionedNetwork } from '../../../domain/VersionedNetwork';
import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import { NetworkId } from '../../../domain/NetworkId';

@injectable()
@EntityRepository(VersionedNetwork)
export class TypeOrmVersionedNetworkRepository
	extends Repository<VersionedNetwork>
	implements VersionedNetworkRepository
{
	async findOneByNetworkId(
		networkId: NetworkId
	): Promise<VersionedNetwork | undefined> {
		return await this.findOne({ networkId });
	}
}
