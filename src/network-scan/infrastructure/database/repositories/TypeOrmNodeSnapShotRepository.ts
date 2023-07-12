import {
	Equal,
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
import Node from '../../../domain/node/Node';
import { NodeSnapShotRepository } from '../../../domain/node/NodeSnapShotRepository';
import PublicKey from '../../../domain/node/PublicKey';

@injectable()
export default class TypeOrmNodeSnapShotRepository
	implements NodeSnapShotRepository
{
	constructor(private nodeSnapShotRepository: Repository<NodeSnapShot>) {}

	async save(nodeSnapShots: NodeSnapShot[]): Promise<NodeSnapShot[]> {
		//temporary solution until we switch to Node as aggregate root
		for (const nodeSnapShot of nodeSnapShots) {
			const nodeCount = await this.nodeSnapShotRepository.manager.count(Node, {
				where: {
					publicKey: {
						value: nodeSnapShot.node.publicKey.value
					}
				}
			});
			if (nodeCount === 0) {
				await this.nodeSnapShotRepository.manager.save(nodeSnapShot.node);
			}
			await this.nodeSnapShotRepository.save(nodeSnapShot);
		}

		return nodeSnapShots;
	}
	/**
	 * Node SnapShots that are active (not archived).
	 */
	async findActive(): Promise<NodeSnapShot[]> {
		return await this.nodeSnapShotRepository.find({
			where: { endDate: NodeSnapShot.MAX_DATE }
		});
	}

	async findActiveAtTime(time: Date) {
		return await this.nodeSnapShotRepository.find({
			where: {
				startDate: LessThanOrEqual(time),
				endDate: MoreThan(time)
			}
		});
	}

	async findActiveByNodeId(nodeIds: number[]) {
		return await this.nodeSnapShotRepository.find({
			where: {
				_node: In(nodeIds),
				endDate: NodeSnapShot.MAX_DATE
			},
			relations: ['_node']
		});
	}

	async archiveInActiveWithMultipleIpSamePort(time: Date): Promise<void> {
		const qb = await this.nodeSnapShotRepository.createQueryBuilder('snapshot');
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

	async findLatestByPublicKey(publicKey: PublicKey, at: Date = new Date()) {
		// @ts-ignore
		return await this.nodeSnapShotRepository.find({
			relations: ['_node'],
			where: {
				_node: {
					publicKey: {
						value: publicKey.value
					}
				},
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
		return await this.nodeSnapShotRepository.find({
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
