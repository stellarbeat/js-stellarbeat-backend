import SnapShotterTemplate from '../../snapshotting/SnapShotterTemplate';
import NodeSnapShotFactory from './NodeSnapShotFactory';
import Organization from '../../organization/Organization';
import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain';
import NodeSnapShot from '../NodeSnapShot';
import olderThanOneDay from './filters/OlderThanOneDay';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { Logger } from '../../../../core/services/PinoLogger';
import Node, { NodeRepository } from '../Node';
import PublicKey from '../PublicKey';
import { NodeSnapShotRepository } from '../NodeSnapShotRepository';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { OrganizationId } from '../../organization/OrganizationId';
import { OrganizationRepository } from '../../organization/OrganizationRepository';

@injectable()
export default class NodeSnapShotter extends SnapShotterTemplate {
	constructor(
		@inject(NETWORK_TYPES.NodeSnapshotRepository)
		protected nodeSnapShotRepository: NodeSnapShotRepository,
		protected nodeSnapShotFactory: NodeSnapShotFactory,
		@inject(NETWORK_TYPES.NodeRepository)
		protected versionedNodeRepository: NodeRepository,
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

	protected async createSnapShot(node: NodeDTO, time: Date) {
		const publicKeyOrError = PublicKey.create(node.publicKey);
		if (publicKeyOrError.isErr()) {
			throw publicKeyOrError.error;
		}
		let versionedNode = await this.findNode(publicKeyOrError.value);

		if (!versionedNode) {
			const publicKeyOrError = PublicKey.create(node.publicKey);
			if (publicKeyOrError.isErr()) throw publicKeyOrError.error;
			versionedNode = new Node(publicKeyOrError.value, time);
		}

		let versionedOrganization: Organization | null = null;
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
		return snapShot.hasNodeChanged(dto);
	}

	protected async createUpdatedSnapShot(
		snapShot: NodeSnapShot,
		dto: NodeDTO,
		time: Date
	): Promise<NodeSnapShot> {
		let organization: Organization | null;
		if (snapShot.organizationChanged(dto)) {
			if (dto.organizationId === undefined || dto.organizationId === null) {
				organization = null;
			} else {
				//Be careful with race conditions.
				organization = await this.findOrCreateVersionedOrganization(
					dto.organizationId,
					time
				);
			}
		} else {
			organization = snapShot.organization;
		}

		const newSnapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(
			snapShot,
			dto,
			time,
			organization
		);
		if (snapShot.nodeIpPortChanged(dto.ip, dto.port))
			newSnapShot.ipChange = true;

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
			versionedOrg = new Organization(organizationIdOrError.value, time);
		}

		return versionedOrg;
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
			snapShot.ipChange &&
			!olderThanOneDay(snapShot.startDate, time)
		);
		//we want to ignore constant ip changes due to badly configured nodes, so a node only gets 1 ip change a day.
	}
}
