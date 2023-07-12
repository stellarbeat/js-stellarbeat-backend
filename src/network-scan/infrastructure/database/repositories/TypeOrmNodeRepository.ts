import { injectable } from 'inversify';
import { EntityManager, Equal, Repository, SelectQueryBuilder } from 'typeorm';
import Node from '../../../domain/node/Node';
import { NodeRepository } from '../../../domain/node/NodeRepository';
import PublicKey from '../../../domain/node/PublicKey';
import NodeMeasurement from '../../../domain/node/NodeMeasurement';
import { Snapshot } from '../../../../core/domain/Snapshot';
import { CustomError } from '../../../../core/errors/CustomError';
import { mapUnknownToError } from '../../../../core/utilities/mapUnknownToError';
import NodeSnapShot from '../../../domain/node/NodeSnapShot';

export class NodePersistenceError extends CustomError {
	constructor(publicKey: string, cause: Error) {
		super(
			`Error persisting node with public-key ${publicKey}`,
			NodePersistenceError.name,
			cause
		);
	}
}

@injectable()
export class TypeOrmNodeRepository implements NodeRepository {
	constructor(private baseNodeRepository: Repository<Node>) {}

	async saveOne(
		node: Node,
		from: Date,
		transactionalEntityManager?: EntityManager
	): Promise<Node> {
		try {
			const baseRepo = transactionalEntityManager
				? transactionalEntityManager
				: this.baseNodeRepository.manager;
			node.snapshots.forEach((snapshot) => {
				snapshot.node = node;
			});
			const measurement = node.latestMeasurement();
			if (measurement) measurement.node = node;
			const count = await baseRepo.count(Node, {
				where: {
					publicKey: {
						value: node.publicKey.value
					}
				}
			});
			if (count === 0) {
				await baseRepo.insert(Node, node);
			}
			const snapshotsToSave = node.snapshots.filter((snapshot) => {
				return (
					snapshot.startDate.getTime() >= from.getTime() ||
					(snapshot.endDate.getTime() >= from.getTime() &&
						snapshot.endDate.getTime() < Snapshot.MAX_DATE.getTime())
				);
			});
			const orderedSnapshotsToSave = snapshotsToSave.sort(
				(a, b) => a.startDate.getTime() - b.startDate.getTime()
			);

			//we need the correct order to avoid unique key violation [node, endDate].
			// EndDate of the previous currentSnapshot needs to be changed first before adding a new snapshot with the max endDate
			//Typeorm ignores the order when persisting in one go
			for (const snapshot of orderedSnapshotsToSave) {
				await baseRepo.save(NodeSnapShot, snapshot);
			}

			// manager is workaround for changes type not correctly persisted https://github.com/typeorm/typeorm/issues/7558
			//await baseRepo.save([...orderedSnapshotsToSave], {});
			if (measurement) await baseRepo.save(NodeMeasurement, measurement);

			return node;
		} catch (e) {
			throw new NodePersistenceError(
				node.publicKey.value,
				mapUnknownToError(e)
			);
		}
	}

	async save(nodes: Node[], from: Date): Promise<Node[]> {
		await this.baseNodeRepository.manager.transaction(
			async (transactionalEntityManager: EntityManager) => {
				for (const node of nodes) {
					await this.saveOne(node, from, transactionalEntityManager);
				}
			}
		);

		return nodes;
	}

	async findActiveByPublicKeyAtTimePoint(
		publicKey: PublicKey,
		at: Date
	): Promise<Node | null> {
		return await this.getActiveNodesAtTimePointBaseQuery(at)
			.where({
				publicKey: publicKey
			})
			.getOne();
	}

	async findByPublicKey(publicKeys: PublicKey[]): Promise<Node[]> {
		if (publicKeys.length === 0) return [];

		const publicKeyStrings = publicKeys.map((publicKey) => publicKey.value);
		return await this.getNodesBaseQuery()
			.where('node.publicKey.value in (:...publicKeyStrings)', {
				publicKeyStrings: publicKeyStrings
			})
			.getMany();
	}

	async findOneByPublicKey(publicKey: PublicKey): Promise<Node | null> {
		return await this.getNodesBaseQuery()
			.where({
				publicKey: publicKey
			})
			.getOne();
	}

	async findActiveAtTimePoint(at: Date): Promise<Node[]> {
		return await this.getActiveNodesAtTimePointBaseQuery(at).getMany();
	}

	async findActive(): Promise<Node[]> {
		return await this.getActiveNodesBaseQuery().getMany();
	}

	async findActiveByPublicKey(publicKeys: string[]): Promise<Node[]> {
		if (publicKeys.length === 0) return [];

		return await this.getActiveNodesBaseQuery()
			.where('node.publicKey.value in (:...publicKeys)', {
				publicKeys: publicKeys
			})
			.getMany();
	}

	private getNodesBaseQuery(): SelectQueryBuilder<Node> {
		return this.baseNodeRepository
			.createQueryBuilder('node')
			.innerJoinAndSelect(
				'node._snapshots',
				'snapshots',
				'snapshots."NodeId" = node.id and snapshots."endDate" = (select max(snapshots2."endDate") from "node_snap_shot" snapshots2 where snapshots2."NodeId" = node.id)'
			)
			.leftJoinAndMapOne(
				'snapshots._quorumSet',
				'node_quorum_set',
				'quorum_set',
				'quorum_set."id" = snapshots."QuorumSetId"'
			)
			.leftJoinAndMapOne(
				'snapshots._nodeDetails',
				'node_details',
				'node_details',
				'node_details."id" = snapshots."NodeDetailsId"'
			)
			.leftJoinAndMapOne(
				'snapshots._geoData',
				'node_geo_data',
				'node_geo_data',
				'node_geo_data."id" = snapshots."GeoDataId"'
			)
			.leftJoinAndSelect(
				'node._measurements',
				'measurements',
				'measurements."nodeId"= node.id and measurements."time" = (select max(measurements2."time") from "node_measurement_v2" measurements2 where measurements2."nodeId" = node.id)'
			);
	}

	private getActiveNodesBaseQuery(): SelectQueryBuilder<Node> {
		return this.baseNodeRepository
			.createQueryBuilder('node')
			.innerJoinAndSelect(
				'node._snapshots',
				'snapshots',
				'snapshots."NodeId" = node.id AND snapshots."endDate" = :max',
				{
					max: Snapshot.MAX_DATE
				}
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
			.leftJoinAndSelect(
				'node._measurements',
				'measurements',
				'measurements."nodeId"= node.id and measurements."time" = (select max(measurements2."time") from "node_measurement_v2" measurements2 where measurements2."nodeId" = node.id)'
			);
	}

	private getActiveNodesAtTimePointBaseQuery(
		at: Date
	): SelectQueryBuilder<Node> {
		return this.baseNodeRepository
			.createQueryBuilder('node')
			.innerJoinAndSelect(
				'node._snapshots',
				'snapshots',
				'snapshots."NodeId" = node.id AND snapshots."startDate" <= :at AND snapshots."endDate" > :at',
				{ at }
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
			.leftJoinAndSelect(
				'node._measurements',
				'measurements',
				'measurements."nodeId"= node.id and measurements."time" = :time',
				{ time: at }
			);
	}
}
