import {Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../../entities/CrawlV2";
import * as Sentry from "@sentry/node";
import {SnapShot} from "../../entities/NodeSnapShot";

type Entity = Node|Organization;

export default abstract class SnapShotterTemplate {

    async updateOrCreateSnapShots(entities: Entity[], crawl: CrawlV2):Promise<SnapShot[]> {
        let activeSnapShots = await this.findActiveSnapShots();
        activeSnapShots = await this.updateActiveSnapShots(activeSnapShots, entities, crawl);
        let entitiesWithoutSnapShots = this.getEntitiesWithoutSnapShots(activeSnapShots, entities);
        let newSnapShots = await this.createSnapShots(entitiesWithoutSnapShots, crawl);

        return [...activeSnapShots, ...newSnapShots];
    }

    protected async updateActiveSnapShots(activeSnapShots: SnapShot[], entities: Entity[], crawl: CrawlV2) {
        let entityMap = this.getIdToEntityMap(entities);
        let newActiveSnapShots: SnapShot[] = [];
        await Promise.all(activeSnapShots.map(async (snapShot) => {
            try {
                let entity = this.getEntityConnectedToSnapShot(snapShot, entityMap);
                if (entity) {
                    let updatedEntity = await this.updateActiveSnapShot(snapShot, entity, crawl);
                    newActiveSnapShots.push(updatedEntity);
                } else {
                    newActiveSnapShots.push(snapShot);
                }
            } catch (e) {
                console.log(e); //todo winston
                Sentry.captureException(e);
            }
        }));

        return newActiveSnapShots;
    }

    protected async updateActiveSnapShot(activeSnapShot: SnapShot, entity: Entity, crawl: CrawlV2) {
        if (this.hasEntityChanged(activeSnapShot, entity)) {
            return this.createUpdatedSnapShot(activeSnapShot, entity, crawl);
        } else {
            return activeSnapShot;
        }
    }

    /**
     * Entities that are new or were inactive for a long time and were archived
     */
    protected getEntitiesWithoutSnapShots(activeSnapShots: SnapShot[], entities: Entity[]) {
        let snapShotsMap = this.getIdToSnapShotMap(activeSnapShots);

        let entitiesWithoutSnapShots: Entity[] = [];
        entities.forEach(entity => {
            let snapShot = this.getSnapShotConnectedToEntity(entity, snapShotsMap);
            if (!snapShot) {
                entitiesWithoutSnapShots.push(entity);
            }
        });

        return entitiesWithoutSnapShots;
    }

    protected async createSnapShots(entitiesWithoutSnapShots: Entity[], crawl: CrawlV2) {
        let newSnapShots: SnapShot[] = [];
        await Promise.all(entitiesWithoutSnapShots.map(async (entityWithoutSnapShot) => {
            try {
                let snapShot = await this.createSnapShot(entityWithoutSnapShot, crawl);
                newSnapShots.push(snapShot);
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));

        return newSnapShots;
    }

    abstract findActiveSnapShots(): Promise<SnapShot[]>;
    abstract getIdToEntityMap(entities: Entity[]): Map<string, Entity>;
    abstract getIdToSnapShotMap(snapShots: SnapShot[]): Map<string, SnapShot>;
    abstract getEntityConnectedToSnapShot(snapShot: SnapShot, idToEntityMap: Map<string, Entity>): Entity|undefined;
    abstract getSnapShotConnectedToEntity(entity: Entity, idToSnapShotMap: Map<string, SnapShot>): SnapShot|undefined;
    abstract hasEntityChanged(snapShot: SnapShot, entity: Entity): boolean;
    abstract createUpdatedSnapShot(snapShot: SnapShot, entity: Entity, crawl: CrawlV2): Promise<SnapShot>;
    abstract createSnapShot(entity: Entity, crawl: CrawlV2): Promise<SnapShot>;
}