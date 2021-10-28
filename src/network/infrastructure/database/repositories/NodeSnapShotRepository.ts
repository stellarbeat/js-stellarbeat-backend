import {
	EntityRepository,
	In,
	IsNull,
	LessThanOrEqual,
	MoreThan,
	Not,
	Repository
} from 'typeorm';
import NodeSnapShot from '../entities/NodeSnapShot';
import { SnapShotRepository } from './OrganizationSnapShotRepository';
import NodePublicKeyStorage from '../entities/NodePublicKeyStorage';
import { injectable } from 'inversify';
import NodeMeasurementV2 from '../entities/NodeMeasurementV2';

@injectable()
@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository
	extends Repository<NodeSnapShot>
	implements SnapShotRepository
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

	async findActiveByPublicKeyStorageId(publicKeyStorageIds: number[]) {
		return await this.find({
			where: {
				_nodePublicKey: In(publicKeyStorageIds),
				endDate: NodeSnapShot.MAX_DATE
			}
		});
	}

	async archiveInActiveWithMultipleIpSamePort(time: Date) {
		const qb = await this.createQueryBuilder('snapshot');
		return await qb
			.update(NodeSnapShot)
			.set({ endDate: time })
			.where('endDate = :max', { max: NodeSnapShot.MAX_DATE }) //only archive active snapshots
			.andWhere(
				'"NodePublicKeyId" in ' +
					qb
						.subQuery()
						.distinct(true)
						.select('"nodePublicKeyStorageId"')
						.from(NodeMeasurementV2, 'measurement')
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

	async findLatestChangeDate(
		nodePublicKeyStorage: NodePublicKeyStorage
	): Promise<{ latestChangeDate: Date | undefined } | undefined> {
		return await this.createQueryBuilder('snap_shot')
			.select('MAX("snap_shot"."endDate")', 'latestChangeDate')
			.where('snap_shot._nodePublicKey = :nodePublicKeyId', {
				nodePublicKeyId: nodePublicKeyStorage.id
			})
			.getRawOne();
	}

	async findLatestByNode(
		nodePublicKeyStorage: NodePublicKeyStorage,
		at: Date = new Date()
	) {
		// @ts-ignore
		return await this.find({
			where: {
				_nodePublicKey: nodePublicKeyStorage.id,
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
