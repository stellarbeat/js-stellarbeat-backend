import { Node, Organization } from '@stellarbeat/js-stellar-domain';
import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { Logger } from '../../../core/services/PinoLogger';
import { isString } from '../../../core/utilities/TypeGuards';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { Snapshot } from '../../../core/domain/Snapshot';

type DTO = Node | Organization;

@injectable()
export default abstract class SnapShotterTemplate {
	protected constructor(
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {}

	async updateOrCreateSnapShots(dto: DTO[], time: Date): Promise<Snapshot[]> {
		let activeSnapShots = await this.findActiveSnapShots();
		activeSnapShots = await this.updateActiveSnapShots(
			activeSnapShots,
			dto,
			time
		); //saved to storage
		const entitiesWithoutSnapShots = this.getDTOsWithoutSnapShots(
			activeSnapShots,
			dto
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
		activeSnapShots: Snapshot[],
		dtos: DTO[],
		time: Date
	) {
		const entityMap = this.getIdToDTOMap(dtos);
		const newActiveSnapShots: Snapshot[] = []; //because an entity change could trigger a new snapshot, we want to return the 'new' active snapshots
		for (const snapShot of activeSnapShots) {
			try {
				const entity = this.getDTOConnectedToSnapShot(snapShot, entityMap);
				if (entity) {
					if (await this.shouldBeArchived(entity))
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
		activeSnapShot: Snapshot,
		dto: DTO,
		time: Date
	) {
		if (this.changeShouldBeIgnored(activeSnapShot, dto, time))
			return activeSnapShot;
		if (this.hasChanged(activeSnapShot, dto)) {
			await this.archiveSnapShot(activeSnapShot, time); //we archive the current active snapshot
			return await this.createUpdatedSnapShot(activeSnapShot, dto, time); //we create a new snapshot based on the old one.
		} else {
			return activeSnapShot;
		}
	}

	/**
	 * Entities that are new or were inactive for a long time and were archived
	 */
	protected getDTOsWithoutSnapShots(activeSnapShots: Snapshot[], dtos: DTO[]) {
		const snapShotsMap = this.getIdToSnapShotMap(activeSnapShots);

		const dtosWithoutSnapShots: DTO[] = [];
		dtos.forEach((dto) => {
			const snapShot = this.getSnapShotConnectedToDTO(dto, snapShotsMap);
			if (!snapShot) {
				dtosWithoutSnapShots.push(dto);
			}
		});

		return dtosWithoutSnapShots;
	}

	protected async createSnapShots(dtosWithoutSnapShots: DTO[], time: Date) {
		const newSnapShots: Snapshot[] = [];
		for (const dtoWithoutSnapShot of dtosWithoutSnapShots) {
			try {
				if (!(await this.shouldBeArchived(dtoWithoutSnapShot))) {
					const snapShot = await this.createSnapShot(dtoWithoutSnapShot, time);
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

	abstract findActiveSnapShots(): Promise<Snapshot[]>;
	protected abstract getIdToDTOMap(entities: DTO[]): Map<string, DTO>;
	protected abstract getIdToSnapShotMap(
		snapShots: Snapshot[]
	): Map<string, Snapshot>;
	protected abstract getDTOConnectedToSnapShot(
		snapShot: Snapshot,
		idToEntityMap: Map<string, DTO>
	): DTO | undefined;
	protected abstract getSnapShotConnectedToDTO(
		entity: DTO,
		idToSnapShotMap: Map<string, Snapshot>
	): Snapshot | undefined;
	protected abstract hasChanged(snapShot: Snapshot, dto: DTO): boolean;
	protected abstract createUpdatedSnapShot(
		snapShot: Snapshot,
		dto: DTO,
		time: Date
	): Promise<Snapshot>;
	protected abstract createSnapShot(
		dto: DTO,
		time: Date
	): Promise<Snapshot | undefined>;

	protected abstract archiveSnapShot(
		snapShot: Snapshot,
		time: Date
	): Promise<void>;
	//certain entity configurations are invalid and should not be tracked with snapshots
	protected abstract shouldBeArchived(dto: DTO): Promise<boolean>;
	//certain entity changes are ignored to avoid filling up the database
	protected abstract changeShouldBeIgnored(
		snapShot: Snapshot,
		entity: DTO,
		time: Date
	): boolean;
}
