import SnapShotterTemplate from './SnapShotterTemplate';
import OrganizationSnapShotRepository from '../repositories/OrganizationSnapShotRepository';
import OrganizationId, {
	OrganizationIdRepository
} from '../../../domain/OrganizationId';
import OrganizationSnapShotFactory from './factory/OrganizationSnapShotFactory';
import { Organization } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShot from '../entities/OrganizationSnapShot';
import { inject, injectable } from 'inversify';
import NodeSnapShot from '../entities/NodeSnapShot';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { Logger } from '../../../../core/services/PinoLogger';
import PublicKey from '../../../domain/PublicKey';
import VersionedNode, {
	VersionedNodeRepository
} from '../entities/VersionedNode';

@injectable()
export default class OrganizationSnapShotter extends SnapShotterTemplate {
	protected _nodeSnapShotsMap: Map<string, NodeSnapShot> | undefined;

	constructor(
		@inject('NodePublicKeyStorageRepository')
		protected versionedNodeRepository: VersionedNodeRepository,
		protected organizationSnapShotRepository: OrganizationSnapShotRepository,
		@inject('OrganizationIdStorageRepository')
		protected organizationIdStorageRepository: OrganizationIdRepository,
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
		entities: Organization[],
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

	protected async createSnapShot(organization: Organization, time: Date) {
		const organizationIdStorage = await this.findOrCreateOrganizationIdStorage(
			organization.id,
			time
		);

		if (organization.homeDomain) {
			//todo: only when different? legacy?
			//organizationIdStorage created by node snapshotter, that does not have the home domain information. todo: node and organization snapshotter are more closely linked then anticipated. Review snapshotter design or pass organization entities to node snapshotter.
			organizationIdStorage.homeDomain = organization.homeDomain;
			await this.organizationIdStorageRepository.save(organizationIdStorage);
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
			organizationIdStorage,
			organization,
			time,
			validators
		);
		return await this.organizationSnapShotRepository.save(
			newOrganizationSnapShot
		);
	}

	protected getEntityConnectedToSnapShot(
		snapShot: OrganizationSnapShot,
		idToEntityMap: Map<string, Organization>
	): Organization | undefined {
		return idToEntityMap.get(snapShot.organizationIdStorage.organizationId);
	}

	protected getIdToEntityMap(
		entities: Organization[]
	): Map<string, Organization> {
		return new Map(entities.map((org) => [org.id, org]));
	}

	protected getIdToSnapShotMap(
		snapShots: OrganizationSnapShot[]
	): Map<string, OrganizationSnapShot> {
		return new Map(
			snapShots.map((snapshot) => [
				snapshot.organizationIdStorage.organizationId,
				snapshot
			])
		);
	}

	protected getSnapShotConnectedToEntity(
		entity: Organization,
		idToSnapShotMap: Map<string, OrganizationSnapShot>
	): OrganizationSnapShot | undefined {
		return idToSnapShotMap.get(entity.id);
	}

	protected hasEntityChanged(
		snapShot: OrganizationSnapShot,
		entity: Organization
	): boolean {
		return snapShot.organizationChanged(entity);
	}

	protected async createUpdatedSnapShot(
		snapShot: OrganizationSnapShot,
		entity: Organization,
		time: Date
	): Promise<OrganizationSnapShot> {
		let validators: VersionedNode[];
		if (snapShot.validatorsChanged(entity)) {
			validators = await Promise.all(
				entity.validators.map((publicKey) => this.findOrCreateNode(publicKey))
			); //todo: could be more efficient
		} else {
			validators = snapShot.validators;
		}
		const newSnapShot = this.organizationSnapShotFactory.createUpdatedSnapShot(
			snapShot,
			entity,
			time,
			validators
		);
		await this.organizationSnapShotRepository.save([snapShot, newSnapShot]);
		if (
			entity.homeDomain &&
			entity.homeDomain !== snapShot.organizationIdStorage.homeDomain
		) {
			//todo legacy fix for first inserts of home domains, to be deleted in v0.4.0
			snapShot.organizationIdStorage.homeDomain = entity.homeDomain;
			await this.organizationIdStorageRepository.save(
				snapShot.organizationIdStorage
			);
		}

		return newSnapShot;
	}

	protected async findOrCreateNode(publicKey: string) {
		const publicKeyOrError = PublicKey.create(publicKey);
		if (publicKeyOrError.isErr()) throw publicKeyOrError.error;
		let versionedNode = await this.versionedNodeRepository.findOne({
			where: { publicKey: publicKeyOrError.value }
		});

		if (!versionedNode) {
			versionedNode = new VersionedNode(publicKeyOrError.value);
		}

		return versionedNode;
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
			organizationIdStorage = new OrganizationId(organizationId, time);
		}

		return organizationIdStorage;
	}

	protected async archiveSnapShot(snapshot: OrganizationSnapShot, time: Date) {
		snapshot.endDate = time;
		await this.organizationSnapShotRepository.save(snapshot);
	}

	protected async findOrganizationIdStorage(organizationId: string) {
		return await this.organizationIdStorageRepository.findOne({
			where: { organizationId: organizationId }
		});
	}

	async findLatestSnapShotsByOrganization(organizationId: string, at: Date) {
		const organizationIdStorage = await this.findOrganizationIdStorage(
			organizationId
		);
		if (!organizationIdStorage) return [];

		return await this.organizationSnapShotRepository.findLatestByOrganization(
			organizationIdStorage,
			at
		);
	}

	async findLatestSnapShots(at: Date) {
		return await this.organizationSnapShotRepository.findLatest(at);
	}

	protected async entityShouldBeArchived(entity: Organization) {
		const validatorSnapShots = entity.validators
			.map((publicKey) => this.getNodeSnapShotByPublicKey(publicKey))
			.filter((snapShot) => snapShot !== undefined);
		return validatorSnapShots.length === 0; //we only track organizations with active node snapshots
	}

	protected entityChangeShouldBeIgnored(): boolean {
		return false; //no changes are ignored
	}
}
