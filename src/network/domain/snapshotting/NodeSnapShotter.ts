import SnapShotterTemplate from './SnapShotterTemplate';
import NodeSnapShotFactory from './factory/NodeSnapShotFactory';
import VersionedOrganization from '../VersionedOrganization';
import { Node } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../NodeSnapShot';
import olderThanOneDay from './filters/OlderThanOneDay';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { Logger } from '../../../core/services/PinoLogger';
import VersionedNode, { VersionedNodeRepository } from '../VersionedNode';
import PublicKey from '../PublicKey';
import { NodeSnapShotRepository } from './NodeSnapShotRepository';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import { OrganizationId } from '../OrganizationId';
import { VersionedOrganizationRepository } from '../VersionedOrganizationRepository';

@injectable()
export default class NodeSnapShotter extends SnapShotterTemplate {
	constructor(
		@inject(NETWORK_TYPES.NodeSnapshotRepository)
		protected nodeSnapShotRepository: NodeSnapShotRepository,
		protected nodeSnapShotFactory: NodeSnapShotFactory,
		@inject(NETWORK_TYPES.VersionedNodeRepository)
		protected versionedNodeRepository: VersionedNodeRepository,
		@inject(NETWORK_TYPES.VersionedOrganizationRepository)
		protected versionedOrganizationRepository: VersionedOrganizationRepository,
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
		const node = await this.findNode(publicKey);
		if (!node) return [];

		return await this.nodeSnapShotRepository.findLatestByNode(node, at);
	}

	protected async createSnapShot(node: Node, time: Date) {
		const publicKeyOrError = PublicKey.create(node.publicKey);
		if (publicKeyOrError.isErr()) {
			throw publicKeyOrError.error;
		}
		let versionedNode = await this.findNode(publicKeyOrError.value);

		if (!versionedNode) {
			const publicKeyOrError = PublicKey.create(node.publicKey);
			if (publicKeyOrError.isErr()) throw publicKeyOrError.error;
			versionedNode = new VersionedNode(publicKeyOrError.value, time);
		}

		let versionedOrganization: VersionedOrganization | null = null;
		if (node.organizationId)
			versionedOrganization = await this.findOrCreateVersionedOrganization(
				node.organizationId,
				time
			);

		const snapShot = this.nodeSnapShotFactory.create(
			versionedNode,
			node,
			time,
			versionedOrganization
		);
		await this.nodeSnapShotRepository.save([snapShot]);

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
		let versionedOrganization: VersionedOrganization | null;
		if (snapShot.organizationChanged(entity)) {
			if (
				entity.organizationId === undefined ||
				entity.organizationId === null
			) {
				versionedOrganization = null;
			} else {
				//Be careful with race conditions.
				versionedOrganization = await this.findOrCreateVersionedOrganization(
					entity.organizationId,
					time
				);
			}
		} else {
			versionedOrganization = snapShot.organization;
		}

		const newSnapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(
			snapShot,
			entity,
			time,
			versionedOrganization
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

	protected async findOrCreateVersionedOrganization(
		organizationId: string,
		time: Date
	) {
		const organizationIdOrError = OrganizationId.create(organizationId);
		if (organizationIdOrError.isErr()) throw organizationIdOrError.error;
		let versionedOrg =
			await this.versionedOrganizationRepository.findByOrganizationId(
				organizationIdOrError.value
			);

		if (!versionedOrg) {
			versionedOrg = new VersionedOrganization(
				organizationIdOrError.value,
				time
			);
		}

		return versionedOrg;
	}

	protected async archiveSnapShot(snapshot: NodeSnapShot, time: Date) {
		snapshot.endDate = time;
		await this.nodeSnapShotRepository.save([snapshot]);
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
