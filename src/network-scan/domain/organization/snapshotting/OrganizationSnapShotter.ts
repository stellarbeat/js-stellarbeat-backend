import SnapShotterTemplate from '../../snapshotting/SnapShotterTemplate';
import Organization from '../Organization';
import OrganizationSnapShotFactory from './OrganizationSnapShotFactory';
import { Organization as OrganizationDTO } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShot from '../OrganizationSnapShot';
import { inject, injectable } from 'inversify';
import NodeSnapShot from '../../node/NodeSnapShot';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { Logger } from '../../../../core/services/PinoLogger';
import PublicKey from '../../node/PublicKey';
import Node, { NodeRepository } from '../../node/Node';
import { OrganizationSnapShotRepository } from './OrganizationSnapShotRepository';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { OrganizationId } from '../OrganizationId';
import { OrganizationRepository } from '../OrganizationRepository';

@injectable()
export default class OrganizationSnapShotter extends SnapShotterTemplate {
	protected _nodeSnapShotsMap: Map<string, NodeSnapShot> | undefined;

	constructor(
		@inject(NETWORK_TYPES.NodeRepository)
		protected nodeRepository: NodeRepository,
		@inject(NETWORK_TYPES.OrganizationSnapshotRepository)
		protected organizationSnapShotRepository: OrganizationSnapShotRepository,
		@inject(NETWORK_TYPES.OrganizationRepository)
		protected organizationRepository: OrganizationRepository,
		protected organizationSnapShotFactory: OrganizationSnapShotFactory,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {
		super(exceptionLogger, logger);
	}

	//todo: need better way to inject nodeSnapShots
	setNodeSnapShots(nodeSnapShots: NodeSnapShot[]) {
		const map = new Map<string, NodeSnapShot>();
		nodeSnapShots.forEach((snapShot) =>
			map.set(snapShot.node.publicKey.value, snapShot)
		);
		this._nodeSnapShotsMap = map;
	}

	protected getNodeSnapShotByPublicKey(
		publicKey: string
	): NodeSnapShot | undefined {
		if (!this._nodeSnapShotsMap) throw new Error('NodeSnapShots not set');

		return this._nodeSnapShotsMap.get(publicKey);
	}

	async updateOrCreateSnapShots(
		entities: OrganizationDTO[],
		time: Date
	): Promise<OrganizationSnapShot[]> {
		return (await super.updateOrCreateSnapShots(
			entities,
			time
		)) as OrganizationSnapShot[];
	}

	async findActiveSnapShots() {
		return await this.organizationSnapShotRepository.findActive();
	}

	async findSnapShotsActiveAtTime(time: Date) {
		return await this.organizationSnapShotRepository.findActiveAtTime(time);
	}

	protected async createSnapShot(organization: OrganizationDTO, time: Date) {
		const organizationIdOrError = OrganizationId.create(organization.id);
		if (organizationIdOrError.isErr()) {
			throw organizationIdOrError.error;
		}
		const versionedOrganization = await this.findOrCreateOrganization(
			organizationIdOrError.value,
			time
		);

		if (organization.homeDomain) {
			//todo: only when different? legacy?
			//organizationIdStorage created by node snapshotter, that does not have the home domain information. todo: node and organization snapshotter are more closely linked then anticipated. Review snapshotter design or pass organization entities to node snapshotter.
			versionedOrganization.homeDomain = organization.homeDomain;
			await this.organizationRepository.save(versionedOrganization);
		}

		const validators = await Promise.all(
			organization.validators.map((publicKey) =>
				//if a validator is active it will be returned.
				//if a validator is archived it will be returned.
				//if a validator is not known to us, we will create it. But it won't have a snapshot until we detect it through crawling. Warning: the toml validator field could be abused to fill up our db.
				//But the positive side is that the frontend will show the correct representation of the toml file. And if the user clicks on the node, it will show that it is unknown to us.
				this.findOrCreateNode(publicKey)
			)
		);
		const newOrganizationSnapShot = this.organizationSnapShotFactory.create(
			versionedOrganization,
			organization,
			time,
			validators
		);
		await this.organizationSnapShotRepository.save([newOrganizationSnapShot]);

		return newOrganizationSnapShot;
	}

	protected getDTOConnectedToSnapShot(
		snapShot: OrganizationSnapShot,
		idToDTO: Map<string, OrganizationDTO>
	): OrganizationDTO | undefined {
		return idToDTO.get(snapShot.organization.organizationId.value);
	}

	protected getIdToDTOMap(
		dtos: OrganizationDTO[]
	): Map<string, OrganizationDTO> {
		return new Map(dtos.map((org) => [org.id, org]));
	}

	protected getIdToSnapShotMap(
		snapShots: OrganizationSnapShot[]
	): Map<string, OrganizationSnapShot> {
		return new Map(
			snapShots.map((snapshot) => [
				snapshot.organization.organizationId.value,
				snapshot
			])
		);
	}

	protected getSnapShotConnectedToEntity(
		dto: OrganizationDTO,
		idToSnapShotMap: Map<string, OrganizationSnapShot>
	): OrganizationSnapShot | undefined {
		return idToSnapShotMap.get(dto.id);
	}

	protected hasEntityChanged(
		snapShot: OrganizationSnapShot,
		dto: OrganizationDTO
	): boolean {
		return snapShot.organizationChanged(dto);
	}

	protected async createUpdatedSnapShot(
		snapShot: OrganizationSnapShot,
		dto: OrganizationDTO,
		time: Date
	): Promise<OrganizationSnapShot> {
		let validators: Node[];
		if (snapShot.validatorsChanged(dto)) {
			validators = await Promise.all(
				dto.validators.map((publicKey) => this.findOrCreateNode(publicKey))
			); //todo: could be more efficient
		} else {
			validators = snapShot.validators;
		}
		const newSnapShot = this.organizationSnapShotFactory.createUpdatedSnapShot(
			snapShot,
			dto,
			time,
			validators
		);
		await this.organizationSnapShotRepository.save([snapShot, newSnapShot]);
		if (dto.homeDomain && dto.homeDomain !== snapShot.organization.homeDomain) {
			//todo legacy fix for first inserts of home domains, to be deleted in v0.4.0
			snapShot.organization.homeDomain = dto.homeDomain;
			await this.organizationRepository.save(snapShot.organization);
		}

		return newSnapShot;
	}

	protected async findOrCreateNode(publicKey: string) {
		const publicKeyOrError = PublicKey.create(publicKey);
		if (publicKeyOrError.isErr()) throw publicKeyOrError.error;
		let versionedNode = await this.nodeRepository.findOne({
			where: { publicKey: publicKeyOrError.value }
		});

		if (!versionedNode) {
			versionedNode = new Node(publicKeyOrError.value);
		}

		return versionedNode;
	}

	protected async findOrCreateOrganization(
		organizationId: OrganizationId,
		time: Date
	) {
		let versionedOrg = await this.organizationRepository.findByOrganizationId(
			organizationId
		);

		if (!versionedOrg) {
			versionedOrg = new Organization(organizationId, time);
		}

		return versionedOrg;
	}

	protected async archiveSnapShot(snapshot: OrganizationSnapShot, time: Date) {
		snapshot.endDate = time;
		await this.organizationSnapShotRepository.save([snapshot]);
	}

	protected async findOrganization(organizationId: OrganizationId) {
		return await this.organizationRepository.findByOrganizationId(
			organizationId
		);
	}

	async findLatestSnapShotsByOrganizationId(
		organizationId: OrganizationId,
		at: Date
	) {
		const organization = await this.findOrganization(organizationId);
		if (!organization) return [];

		return await this.organizationSnapShotRepository.findLatestByOrganization(
			organization,
			at
		);
	}

	async findLatestSnapShots(at: Date) {
		return await this.organizationSnapShotRepository.findLatest(at);
	}

	protected async entityShouldBeArchived(dto: OrganizationDTO) {
		const validatorSnapShots = dto.validators
			.map((publicKey) => this.getNodeSnapShotByPublicKey(publicKey))
			.filter((snapShot) => snapShot !== undefined);
		return validatorSnapShots.length === 0; //we only track organizations with active node snapshots
	}

	protected entityChangeShouldBeIgnored(): boolean {
		return false; //no changes are ignored
	}
}