import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import { Snapshot } from '../../../../core/domain/Snapshot';
import Node from '../../../domain/node/Node';
import { NodeRepository } from '../../../domain/node/NodeRepository';
import PublicKey from '../../../domain/node/PublicKey';

@injectable()
@EntityRepository(Node)
export class TypeOrmNodeRepository
	extends Repository<Node>
	implements NodeRepository
{
	async findActiveByPublicKey(publicKey: PublicKey): Promise<Node | undefined> {
		return await this.createQueryBuilder('node')
			.innerJoinAndSelect(
				'node._snapshots',
				'snapshots',
				'snapshots."NodeId" = node.id AND snapshots."endDate" = :maxDate',
				{ maxDate: Snapshot.MAX_DATE }
			)
			.where({
				publicKey: publicKey
			})
			.getOne();
	}

	async findOneByPublicKey(publicKey: PublicKey): Promise<Node | undefined> {
		return await this.createQueryBuilder('node')
			.innerJoinAndSelect(
				'node._snapshots',
				'snapshots',
				'snapshots."NodeId" = node.id',
				{ limit: 1, order: { time: 'DESC' } }
			)
			.where({
				publicKey: publicKey
			})
			.getOne();
	}
}
