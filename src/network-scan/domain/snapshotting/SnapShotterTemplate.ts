import { Node, Organization } from '@stellarbeat/js-stellar-domain';
import { SnapShot } from '../node/NodeSnapShot';
import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { Logger } from '../../../core/services/PinoLogger';
import { isString } from '../../../core/utilities/TypeGuards';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';

type Entity = Node | Organization;

@injectable()
export default abstract class SnapShotterTemplate {
	protected constructor(
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {}

	async updateOrCreateSnapShots(
		entities: Entity[],
		time: Date
	): Promise<SnapShot[]> {
		let activeSnapShots = await this.findActiveSnapShots();
		activeSnapShots = await this.updateActiveSnapShots(
			activeSnapShots,
			entities,
			time
		); //saved to storage
		const entitiesWithoutSnapShots = this.getEntitiesWithoutSnapShots(
			activeSnapShots,
			entities
		); //saved to storage
		if (entitiesWithoutSnapShots.length > 0)
			this.logger.info('Newly detected entities: ' + entitiesWithoutSnapShots);
		const newSnapShots = await this.createSnapShots(
			entitiesWithoutSnapShots,
			time
		);

		//todo: could we delay persistence and return entities to be saved in one big transaction?
		return [...activeSnapShots, ...newSnapShots];
	}

	protected async updateActiveSnapShots(
		activeSnapShots: SnapShot[],
		entities: Entity[],
		time: Date
	) {
		const entityMap = this.getIdToDTOMap(entities);
		const newActiveSnapShots: SnapShot[] = []; //because an entity change could trigger a new snapshot, we want to return the 'new' active snapshots
		for (const snapShot of activeSnapShots) {
			try {
				const entity = this.getDTOConnectedToSnapShot(snapShot, entityMap);
				if (entity) {
					if (await this.entityShouldBeArchived(entity))
						await this.archiveSnapShot(snapShot, time);
					else {
						const newActiveSnapShot = await this.updateActiveSnapShot(
							snapShot,
							entity,
							time
						);
						//if entity was updated, a new snapshot is created
						newActiveSnapShots.push(newActiveSnapShot);
					}
				} else {
					const error = new Error(
						'Active snapshot without entity found: ' + JSON.stringify(snapShot)
					); //domain is missing some nodes or organizations!
					this.exceptionLogger.captureException(error);
					this.logger.error(error.message);
					newActiveSnapShots.push(snapShot); //snapshot has not changed
				}
			} catch (e) {
				if (e instanceof Error) {
					this.logger.error(e.message);
					this.exceptionLogger.captureException(e);
				} else if (isString(e)) {
					this.exceptionLogger.captureException(new Error(e));
					this.logger.error(e);
				} else
					this.exceptionLogger.captureException(
						new Error('Error updating snapshot')
					);
			}
		}

		return newActiveSnapShots;
	}

	protected async updateActiveSnapShot(
		activeSnapShot: SnapShot,
		entity: Entity,
		time: Date
	) {
		if (this.entityChangeShouldBeIgnored(activeSnapShot, entity, time))
			return activeSnapShot;
		if (this.hasEntityChanged(activeSnapShot, entity)) {
			await this.archiveSnapShot(activeSnapShot, time); //we archive the current active snapshot
			return await this.createUpdatedSnapShot(activeSnapShot, entity, time); //we create a new snapshot based on the old one.
		} else {
			return activeSnapShot;
		}
	}

	/**
	 * Entities that are new or were inactive for a long time and were archived
	 */
	protected getEntitiesWithoutSnapShots(
		activeSnapShots: SnapShot[],
		entities: Entity[]
	) {
		const snapShotsMap = this.getIdToSnapShotMap(activeSnapShots);

		const entitiesWithoutSnapShots: Entity[] = [];
		entities.forEach((entity) => {
			const snapShot = this.getSnapShotConnectedToEntity(entity, snapShotsMap);
			if (!snapShot) {
				entitiesWithoutSnapShots.push(entity);
			}
		});

		return entitiesWithoutSnapShots;
	}

	protected async createSnapShots(
		entitiesWithoutSnapShots: Entity[],
		time: Date
	) {
		const newSnapShots: SnapShot[] = [];
		for (const entityWithoutSnapShot of entitiesWithoutSnapShots) {
			try {
				if (!(await this.entityShouldBeArchived(entityWithoutSnapShot))) {
					const snapShot = await this.createSnapShot(
						entityWithoutSnapShot,
						time
					);
					if (snapShot) newSnapShots.push(snapShot);
				}
			} catch (e) {
				if (e instanceof Error) {
					this.logger.error(e.message);
					this.exceptionLogger.captureException(e);
				} else if (isString(e)) {
					this.logger.error(e);
					this.exceptionLogger.captureException(new Error(e));
				} else
					this.exceptionLogger.captureException(
						new Error('Error creating snapshots')
					);
			}
		}

		return newSnapShots;
	}

	abstract findActiveSnapShots(): Promise<SnapShot[]>;
	protected abstract getIdToDTOMap(entities: Entity[]): Map<string, Entity>;
	protected abstract getIdToSnapShotMap(
		snapShots: SnapShot[]
	): Map<string, SnapShot>;
	protected abstract getDTOConnectedToSnapShot(
		snapShot: SnapShot,
		idToEntityMap: Map<string, Entity>
	): Entity | undefined;
	protected abstract getSnapShotConnectedToEntity(
		entity: Entity,
		idToSnapShotMap: Map<string, SnapShot>
	): SnapShot | undefined;
	protected abstract hasEntityChanged(
		snapShot: SnapShot,
		entity: Entity
	): boolean;
	protected abstract createUpdatedSnapShot(
		snapShot: SnapShot,
		entity: Entity,
		time: Date
	): Promise<SnapShot>;
	protected abstract createSnapShot(
		entity: Entity,
		time: Date
	): Promise<SnapShot | undefined>;

	protected abstract archiveSnapShot(
		snapShot: SnapShot,
		time: Date
	): Promise<void>;
	//certain entity configurations are invalid and should not be tracked with snapshots
	protected abstract entityShouldBeArchived(entity: Entity): Promise<boolean>;
	//certain entity changes are ignored to avoid filling up the database
	protected abstract entityChangeShouldBeIgnored(
		snapShot: SnapShot,
		entity: Entity,
		time: Date
	): boolean;
}
