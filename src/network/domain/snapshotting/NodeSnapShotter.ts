import SnapShotterTemplate from './SnapShotterTemplate';
import NodeSnapShotRepository from '../../infrastructure/database/repositories/NodeSnapShotRepository';
import NodeSnapShotFactory from './factory/NodeSnapShotFactory';
import VersionedOrganization, {
	VersionedOrganizationRepository
} from '../VersionedOrganization';
import { Node } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../NodeSnapShot';
import olderThanOneDay from './filters/OlderThanOneDay';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { Logger } from '../../../core/services/PinoLogger';
import VersionedNode, { VersionedNodeRepository } from '../VersionedNode';
import PublicKey from '../PublicKey';

@injectable()
export default class NodeSnapShotter extends SnapShotterTemplate {
	constructor(
		protected nodeSnapShotRepository: NodeSnapShotRepository,
		protected nodeSnapShotFactory: NodeSnapShotFactory,
		@inject('NodePublicKeyStorageRepository')
		protected versionedNodeRepository: VersionedNodeRepository,
		@inject('OrganizationIdStorageRepository')
		protected organizationIdStorageRepository: VersionedOrganizationRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {
		super(exceptionLogger, logger);
	}

	async updateOrCreateSnapShots(
		entities: Node[],
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
		const nodePublicKeyStorage = await this.findNode(publicKey);
		if (!nodePublicKeyStorage) return [];

		return await this.nodeSnapShotRepository.findLatestByNode(
			nodePublicKeyStorage,
			at
		);
	}

	protected async createSnapShot(node: Node, time: Date) {
		const publicKeyOrError = PublicKey.create(node.publicKey);
		if (publicKeyOrError.isErr()) {
			throw publicKeyOrError.error;
		}
		let nodePublicKeyStorage = await this.findNode(publicKeyOrError.value);

		if (!nodePublicKeyStorage) {
			const publicKeyOrError = PublicKey.create(node.publicKey);
			if (publicKeyOrError.isErr()) throw publicKeyOrError.error;
			nodePublicKeyStorage = new VersionedNode(publicKeyOrError.value, time);
		}

		let organizationIdStorage: VersionedOrganization | null = null;
		if (node.organizationId)
			organizationIdStorage = await this.findOrCreateOrganizationIdStorage(
				node.organizationId,
				time
			);

		const snapShot = this.nodeSnapShotFactory.create(
			nodePublicKeyStorage,
			node,
			time,
			organizationIdStorage
		);
		await this.nodeSnapShotRepository.save(snapShot);

		return snapShot;
	}

	protected getEntityConnectedToSnapShot(
		snapShot: NodeSnapShot,
		idToEntityMap: Map<string, Node>
	): Node | undefined {
		return idToEntityMap.get(snapShot.node.publicKey.value);
	}

	protected getIdToEntityMap(entities: Node[]): Map<string, Node> {
		return new Map(entities.map((node) => [node.publicKey, node]));
	}

	protected getIdToSnapShotMap(
		snapShots: NodeSnapShot[]
	): Map<string, NodeSnapShot> {
		return new Map(
			snapShots.map((snapshot) => [snapshot.node.publicKey.value, snapshot])
		);
	}

	protected getSnapShotConnectedToEntity(
		entity: Node,
		idToSnapShotMap: Map<string, NodeSnapShot>
	): NodeSnapShot | undefined {
		return idToSnapShotMap.get(entity.publicKey);
	}

	protected hasEntityChanged(snapShot: NodeSnapShot, entity: Node): boolean {
		return snapShot.hasNodeChanged(entity);
	}

	protected async createUpdatedSnapShot(
		snapShot: NodeSnapShot,
		entity: Node,
		time: Date
	): Promise<NodeSnapShot> {
		let organizationIdStorage: VersionedOrganization | null;
		if (snapShot.organizationChanged(entity)) {
			if (
				entity.organizationId === undefined ||
				entity.organizationId === null
			) {
				organizationIdStorage = null;
			} else {
				//careful for race conditions.
				organizationIdStorage = await this.findOrCreateOrganizationIdStorage(
					entity.organizationId,
					time
				);
			}
		} else {
			organizationIdStorage = snapShot.organization;
		}

		const newSnapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(
			snapShot,
			entity,
			time,
			organizationIdStorage
		);
		if (snapShot.nodeIpPortChanged(entity)) newSnapShot.ipChange = true;

		await this.nodeSnapShotRepository.save([snapShot, newSnapShot]);
		return newSnapShot;
	}

	protected async findNode(publicKey: PublicKey) {
		return await this.versionedNodeRepository.findOne({
			where: { publicKey: publicKey }
		});
	}

	protected async findOrCreateOrganizationIdStorage(
		organizationId: string,
		time: Date
	) {
		let organizationIdStorage =
			await this.organizationIdStorageRepository.findOne({
				where: { organizationId: organizationId }
			});

		if (!organizationIdStorage) {
			organizationIdStorage = new VersionedOrganization(organizationId, time);
		}

		return organizationIdStorage;
	}

	protected async archiveSnapShot(snapshot: NodeSnapShot, time: Date) {
		snapshot.endDate = time;
		await this.nodeSnapShotRepository.save(snapshot);
	}

	protected entityShouldBeArchived() {
		//We track all node entities
		return Promise.resolve(false);
	}

	protected entityChangeShouldBeIgnored(
		snapShot: NodeSnapShot,
		entity: Node,
		time: Date
	): boolean {
		return (
			snapShot.nodeIpPortChanged(entity) &&
			snapShot.ipChange &&
			!olderThanOneDay(snapShot.startDate, time)
		);
		//we want to ignore constant ip changes due to badly configured nodes, so a node only gets 1 ip change a day.
	}
}
