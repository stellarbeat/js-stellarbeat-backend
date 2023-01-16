import SnapShotterTemplate from '../../snapshotting/SnapShotterTemplate';
import NodeSnapShotFactory from './NodeSnapShotFactory';
import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../NodeSnapShot';
import olderThanOneDay from './filters/MoreThanOneDayApart';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { Logger } from '../../../../core/services/PinoLogger';
import PublicKey from '../PublicKey';
import { NodeSnapShotRepository } from '../NodeSnapShotRepository';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { OrganizationRepository } from '../../organization/OrganizationRepository';
import { NodeRepository } from '../NodeRepository';

@injectable()
export default class NodeSnapShotter extends SnapShotterTemplate {
	constructor(
		@inject(NETWORK_TYPES.NodeSnapshotRepository)
		protected nodeSnapShotRepository: NodeSnapShotRepository,
		protected nodeSnapShotFactory: NodeSnapShotFactory,
		@inject(NETWORK_TYPES.NodeRepository)
		protected nodeRepository: NodeRepository,
		@inject(NETWORK_TYPES.OrganizationRepository)
		protected versionedOrganizationRepository: OrganizationRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {
		super(exceptionLogger, logger);
	}

	async updateOrCreateSnapShots(
		entities: NodeDTO[],
		time: Date
	): Promise<NodeSnapShot[]> {
		return (await super.updateOrCreateSnapShots(
			entities,
			time
		)) as NodeSnapShot[];
	}

	async findActiveSnapShots() {
		return await this.nodeSnapShotRepository.findActive();
	}

	async findSnapShotsActiveAtTime(time: Date) {
		return await this.nodeSnapShotRepository.findActiveAtTime(time);
	}

	async findLatestSnapShots(at: Date) {
		return await this.nodeSnapShotRepository.findLatest(at);
	}

	async findLatestSnapShotsByNode(publicKey: PublicKey, at: Date) {
		const node = await this.findNode(publicKey);
		if (!node) return [];

		return await this.nodeSnapShotRepository.findLatestByNode(node, at);
	}

	protected async createSnapShot(nodeDTO: NodeDTO, time: Date) {
		const publicKeyOrError = PublicKey.create(nodeDTO.publicKey);
		if (publicKeyOrError.isErr()) {
			throw publicKeyOrError.error;
		}

		console.log('creating snapshot for node', nodeDTO.publicKey);
		const node = await this.findNode(publicKeyOrError.value);
		let snapShot: NodeSnapShot;
		if (node) {
			snapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(
				node.currentSnapshot(),
				nodeDTO,
				time
			);
		} else {
			snapShot = this.nodeSnapShotFactory.create(
				publicKeyOrError.value,
				nodeDTO,
				time
			);
		}

		await this.nodeSnapShotRepository.save([snapShot]);

		return snapShot;
	}

	protected getDTOConnectedToSnapShot(
		snapShot: NodeSnapShot,
		idToEntityMap: Map<string, NodeDTO>
	): NodeDTO | undefined {
		return idToEntityMap.get(snapShot.node.publicKey.value);
	}

	protected getIdToDTOMap(entities: NodeDTO[]): Map<string, NodeDTO> {
		return new Map(entities.map((node) => [node.publicKey, node]));
	}

	protected getIdToSnapShotMap(
		snapShots: NodeSnapShot[]
	): Map<string, NodeSnapShot> {
		return new Map(
			snapShots.map((snapshot) => [snapshot.node.publicKey.value, snapshot])
		);
	}

	protected getSnapShotConnectedToDTO(
		dto: NodeDTO,
		idToSnapShotMap: Map<string, NodeSnapShot>
	): NodeSnapShot | undefined {
		return idToSnapShotMap.get(dto.publicKey);
	}

	protected hasChanged(snapShot: NodeSnapShot, dto: NodeDTO): boolean {
		return snapShot.hasNodeChanged(
			dto.ip,
			dto.port,
			dto.quorumSetHashKey,
			dto.quorumSet,
			NodeSnapShotFactory.createNodeDetails(dto),
			NodeSnapShotFactory.createNodeGeoDataLocation(dto)
		);
	}

	protected async createUpdatedSnapShot(
		snapShot: NodeSnapShot,
		dto: NodeDTO,
		time: Date
	): Promise<NodeSnapShot> {
		const newSnapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(
			snapShot,
			dto,
			time
		);
		if (snapShot.nodeIpPortChanged(dto.ip, dto.port))
			newSnapShot.lastIpChange = time;

		await this.nodeSnapShotRepository.save([snapShot, newSnapShot]);
		return newSnapShot;
	}

	protected async findNode(publicKey: PublicKey) {
		return await this.nodeRepository.findOneByPublicKey(publicKey);
	}

	protected async archiveSnapShot(snapshot: NodeSnapShot, time: Date) {
		snapshot.endDate = time;
		await this.nodeSnapShotRepository.save([snapshot]);
	}

	protected shouldBeArchived() {
		//We track all node entities
		return Promise.resolve(false);
	}

	protected changeShouldBeIgnored(
		snapShot: NodeSnapShot,
		dto: NodeDTO,
		time: Date
	): boolean {
		return (
			snapShot.nodeIpPortChanged(dto.ip, dto.port) &&
			snapShot.lastIpChange !== null &&
			!olderThanOneDay(snapShot.lastIpChange, time)
		);
		//we want to ignore constant ip changes due to badly configured nodes, so a node only gets 1 ip change a day.
	}
}
