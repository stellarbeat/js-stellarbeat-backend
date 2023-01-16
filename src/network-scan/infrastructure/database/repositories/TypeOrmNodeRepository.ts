import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import { Snapshot } from '../../../../core/domain/Snapshot';
import Node from '../../../domain/node/Node';
import { NodeRepository } from '../../../domain/node/NodeRepository';
import PublicKey from '../../../domain/node/PublicKey';
import { ObjectLiteral } from 'typeorm/common/ObjectLiteral';

@injectable()
@EntityRepository(Node)
export class TypeOrmNodeRepository
	extends Repository<Node>
	implements NodeRepository
{
	async findActiveByPublicKey(publicKey: PublicKey): Promise<Node | undefined> {
		const node = await this.createQueryBuilder('node')
			.innerJoinAndSelect(
				'node._snapshots',
				'snapshots',
				'snapshots."NodeId" = node.id AND snapshots."endDate" = :maxDate',
				{ maxDate: Snapshot.MAX_DATE }
			)
			.leftJoinAndMapOne(
				'snapshots._quorumSet',
				'node_quorum_set',
				'quorum_set',
				'quorum_set."id" = snapshots.QuorumSetId'
			)
			.leftJoinAndMapOne(
				'snapshots._nodeDetails',
				'node_details',
				'node_details',
				'node_details."id" = snapshots.NodeDetailsId'
			)
			.leftJoinAndMapOne(
				'snapshots._geoData',
				'node_geo_data',
				'node_geo_data',
				'node_geo_data."id" = snapshots.GeoDataId'
			)
			.where({
				publicKey: publicKey
			})
			.getOne();
		if (node) {
			//temporary until we use it as aggregate root
			node.currentSnapshot().node = node;
		}

		return node;
	}

	async findOneByPublicKey(publicKey: PublicKey): Promise<Node | undefined> {
		const node = await this.createQueryBuilder('node')
			.innerJoinAndSelect(
				'node._snapshots',
				'snapshots',
				'snapshots."NodeId" = node.id',
				{ limit: 1, order: { time: 'DESC' } }
			)
			.leftJoinAndMapOne(
				'snapshots._quorumSet',
				'node_quorum_set',
				'quorum_set',
				'quorum_set."id" = snapshots.QuorumSetId'
			)
			.leftJoinAndMapOne(
				'snapshots._nodeDetails',
				'node_details',
				'node_details',
				'node_details."id" = snapshots.NodeDetailsId'
			)
			.leftJoinAndMapOne(
				'snapshots._geoData',
				'node_geo_data',
				'node_geo_data',
				'node_geo_data."id" = snapshots.GeoDataId'
			)
			.where({
				publicKey: publicKey
			})
			.getOne();
		if (node) {
			//temporary until we use it as aggregate root
			node.currentSnapshot().node = node;
		}
		return node;
	}
}
