import {
	EntityRepository,
	In,
	IsNull,
	LessThanOrEqual,
	MoreThan,
	Not,
	Repository
} from 'typeorm';
import NodeSnapShot from '../../../domain/node/NodeSnapShot';
import { injectable } from 'inversify';
import NodeMeasurement from '../../../domain/node/NodeMeasurement';
import VersionedNode from '../../../domain/node/VersionedNode';
import { NodeSnapShotRepository } from '../../../domain/node/NodeSnapShotRepository';

@injectable()
@EntityRepository(NodeSnapShot)
export default class TypeOrmNodeSnapShotRepository
	extends Repository<NodeSnapShot>
	implements NodeSnapShotRepository
{
	/**
	 * Node SnapShots that are active (not archived).
	 */
	async findActive(): Promise<NodeSnapShot[]> {
		return await this.find({ where: { endDate: NodeSnapShot.MAX_DATE } });
	}

	async findActiveAtTime(time: Date) {
		return await this.find({
			where: {
				startDate: LessThanOrEqual(time),
				endDate: MoreThan(time)
			}
		});
	}

	async findActiveByNodeId(nodeIds: number[]) {
		return await this.find({
			where: {
				_node: In(nodeIds),
				endDate: NodeSnapShot.MAX_DATE
			}
		});
	}

	async archiveInActiveWithMultipleIpSamePort(time: Date): Promise<void> {
		const qb = await this.createQueryBuilder('snapshot');
		await qb
			.update(NodeSnapShot)
			.set({ endDate: time })
			.where('endDate = :max', { max: NodeSnapShot.MAX_DATE }) //only archive active snapshots
			.andWhere(
				'"NodeId" in ' +
					qb
						.subQuery()
						.distinct(true)
						.select('"nodeId"')
						.from(NodeMeasurement, 'measurement')
						.where('measurement.time =:at::timestamptz')
						.andWhere('measurement.isActive = false')
						.getQuery()
			)
			.setParameter('at', time)
			.andWhere(
				"concat(ip, ':', port) IN " +
					qb
						.subQuery() //that are reusing the same ip:port for different public keys
						.select("concat(innerSnapshot.ip, ':', port)")
						.from(NodeSnapShot, 'innerSnapshot')
						.where('innerSnapshot.endDate =:max')
						.groupBy('innerSnapshot.ip, innerSnapshot.port')
						.having('count(*) > 1')
						.getQuery()
			)
			.setParameter('max', NodeSnapShot.MAX_DATE)
			.execute();
	}

	async findLatestByNode(node: VersionedNode, at: Date = new Date()) {
		// @ts-ignore
		return await this.find({
			where: {
				_node: node,
				startDate: LessThanOrEqual(at)
			},
			take: 10,
			order: {
				startDate: 'DESC'
			}
		});
	}

	async findLatest(at: Date = new Date()) {
		// @ts-ignore
		return await this.find({
			where: {
				startDate: LessThanOrEqual(at),
				_quorumSet: Not(IsNull()) //only validators
			},
			take: 10,
			order: {
				startDate: 'DESC'
			}
		});
	}
}
