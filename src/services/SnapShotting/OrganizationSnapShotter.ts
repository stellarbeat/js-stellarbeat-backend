import SnapShotterTemplate from './SnapShotterTemplate';
import NodePublicKeyStorage, {
	NodePublicKeyStorageRepository
} from '../../entities/NodePublicKeyStorage';
import OrganizationSnapShotRepository from '../../repositories/OrganizationSnapShotRepository';
import OrganizationIdStorage, {
	OrganizationIdStorageRepository
} from '../../entities/OrganizationIdStorage';
import OrganizationSnapShotFactory from '../../factory/OrganizationSnapShotFactory';
import {
	Organization,
	OrganizationId,
	PublicKey
} from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShot from '../../entities/OrganizationSnapShot';
import { inject, injectable } from 'inversify';
import NodeSnapShot from '../../entities/NodeSnapShot';
import { ExceptionLogger } from '../ExceptionLogger';
import { Logger } from '../PinoLogger';

@injectable()
export default class OrganizationSnapShotter extends SnapShotterTemplate {
	protected _nodeSnapShotsMap: Map<PublicKey, NodeSnapShot> | undefined;

	constructor(
		@inject('NodePublicKeyStorageRepository')
		protected nodePublicKeyStorageRepository: NodePublicKeyStorageRepository,
		protected organizationSnapShotRepository: OrganizationSnapShotRepository,
		@inject('OrganizationIdStorageRepository')
		protected organizationIdStorageRepository: OrganizationIdStorageRepository,
		protected organizationSnapShotFactory: OrganizationSnapShotFactory,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {
		super(exceptionLogger, logger);
	}

	//todo: need better way to inject nodeSnapShots
	setNodeSnapShots(nodeSnapShots: NodeSnapShot[]) {
		const map = new Map<PublicKey, NodeSnapShot>();
		nodeSnapShots.forEach((snapShot) =>
			map.set(snapShot.nodePublicKey.publicKey, snapShot)
		);
		this._nodeSnapShotsMap = map;
	}

	protected getNodeSnapShotByPublicKey(
		publicKey: PublicKey
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
			//organizationIdStorage created by node snapshotter, that does not have the homedomain information. todo: node and organization snapshotter are more closely linked then anticipated. Review snapshotter design or pass organization entities to node snapshotter.
			organizationIdStorage.homeDomain = organization.homeDomain;
			await this.organizationIdStorageRepository.save(organizationIdStorage);
		}
		const validators = await Promise.all(
			organization.validators.map((publicKey) =>
				this.findOrCreateNodePublicKeyStorage(publicKey, time)
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
		let validators: NodePublicKeyStorage[];
		if (snapShot.validatorsChanged(entity)) {
			validators = await Promise.all(
				entity.validators.map((publicKey) =>
					this.findOrCreateNodePublicKeyStorage(publicKey, time)
				)
			); //todo: could be more efficient
			//careful for race conditions.
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
			//legacy fix for first inserts of homedomains, can be deleted in the future
			snapShot.organizationIdStorage.homeDomain = entity.homeDomain;
			await this.organizationIdStorageRepository.save(
				snapShot.organizationIdStorage
			);
		}

		return newSnapShot;
	}

	protected async findOrCreateNodePublicKeyStorage(
		publicKey: PublicKey,
		time: Date
	) {
		let nodePublicKeyStorage =
			await this.nodePublicKeyStorageRepository.findOne({
				where: { publicKey: publicKey }
			});

		if (!nodePublicKeyStorage) {
			nodePublicKeyStorage = new NodePublicKeyStorage(publicKey, time);
		}

		return nodePublicKeyStorage;
	}

	protected async findOrCreateOrganizationIdStorage(
		organizationId: OrganizationId,
		time: Date
	) {
		let organizationIdStorage =
			await this.organizationIdStorageRepository.findOne({
				where: { organizationId: organizationId }
			});

		if (!organizationIdStorage) {
			organizationIdStorage = new OrganizationIdStorage(organizationId, time);
		}

		return organizationIdStorage;
	}

	protected async saveSnapShot(snapShot: OrganizationSnapShot) {
		return await this.organizationSnapShotRepository.save(snapShot);
	}

	protected async archiveSnapShot(snapshot: OrganizationSnapShot, time: Date) {
		snapshot.endDate = time;
		await this.organizationSnapShotRepository.save(snapshot);
	}

	protected async findOrganizationIdStorage(organizationId: OrganizationId) {
		return await this.organizationIdStorageRepository.findOne({
			where: { organizationId: organizationId }
		});
	}

	async findLatestSnapShotsByOrganization(organizationId: string, at: Date) {
		const organizationIdStorage = await this.findOrganizationIdStorage(
			organizationId
		);
		if (!organizationIdStorage) return [];

		const snapShots =
			await this.organizationSnapShotRepository.findLatestByOrganization(
				organizationIdStorage,
				at
			);

		return snapShots;
	}

	async findLatestSnapShots(at: Date) {
		return await this.organizationSnapShotRepository.findLatest(at);
	}

	protected async entityShouldBeTracked(entity: Organization) {
		const validatorSnapShots = entity.validators
			.map((publicKey) => this.getNodeSnapShotByPublicKey(publicKey))
			.filter((snapShot) => snapShot !== undefined);
		return validatorSnapShots.length !== 0; //we only track organizations with active node snapshots
	}

	protected entityChangeShouldBeIgnored(
		snapShot: OrganizationSnapShot,
		entity: Organization,
		time: Date
	): boolean {
		return false; //no changes are ignored
	}
}
