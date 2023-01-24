import { injectable } from 'inversify';
import {
	EntityManager,
	EntityRepository,
	Repository,
	SelectQueryBuilder
} from 'typeorm';
import { Snapshot } from '../../../../core/domain/Snapshot';
import Node from '../../../domain/node/Node';
import { NodeRepository } from '../../../domain/node/NodeRepository';
import PublicKey from '../../../domain/node/PublicKey';
import NodeMeasurement from '../../../domain/node/NodeMeasurement';

@injectable()
@EntityRepository(Node)
export class TypeOrmNodeRepository implements NodeRepository {
	constructor(private baseNodeRepository: Repository<Node>) {}

	async saveOne(
		node: Node,
		transactionalEntityManager?: EntityManager
	): Promise<Node> {
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
				publicKey: node.publicKey
			}
		});
		if (count === 0) {
			await baseRepo.insert(Node, node);
		}

		// manager is workaround for changes type not correctly persisted https://github.com/typeorm/typeorm/issues/7558
		await baseRepo.save([...node.snapshots], {});
		if (measurement) await baseRepo.insert(NodeMeasurement, measurement);

		return node;
	}

	async save(nodes: Node[]): Promise<Node[]> {
		await this.baseNodeRepository.manager.transaction(
			async (transactionalEntityManager: EntityManager) => {
				for (const node of nodes) {
					await this.saveOne(node, transactionalEntityManager);
				}
			}
		);

		return nodes;
	}

	async findActiveByPublicKey(publicKey: PublicKey): Promise<Node | undefined> {
		const node = await this.getActiveNodesBaseQuery()
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

	async findByPublicKey(publicKeys: PublicKey[]): Promise<Node[]> {
		if (publicKeys.length === 0) return [];

		const publicKeyStrings = publicKeys.map((publicKey) => publicKey.value);
		const nodes = await this.getNodesBaseQuery()
			.where('node.publicKey.value in (:...publicKeyStrings)', {
				publicKeyStrings: publicKeyStrings
			})
			.getMany();

		nodes.forEach((node) => {
			//temporary until we use it as aggregate root
			node.currentSnapshot().node = node;
		});

		return nodes;
	}

	async findOneByPublicKey(publicKey: PublicKey): Promise<Node | undefined> {
		const node = await this.getNodesBaseQuery()
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

	async findActive(): Promise<Node[]> {
		const nodes = await this.getActiveNodesBaseQuery().getMany();
		nodes.forEach((node) => {
			//temporary until we use it as aggregate root
			node.currentSnapshot().node = node;
		});

		return nodes;
	}

	private getNodesBaseQuery(): SelectQueryBuilder<Node> {
		return this.baseNodeRepository
			.createQueryBuilder('node')

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
			.leftJoinAndSelect(
				'node._measurements',
				'measurements',
				'measurements."nodeId"= node.id',
				{ limit: 1, order: { time: 'DESC' } }
			);
	}

	private getActiveNodesBaseQuery(): SelectQueryBuilder<Node> {
		return this.baseNodeRepository
			.createQueryBuilder('node')
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
			.leftJoinAndSelect(
				'node._measurements',
				'measurements',
				'measurements."nodeId"= node.id',
				{ limit: 1, order: { time: 'DESC' } }
			);
	}
}
