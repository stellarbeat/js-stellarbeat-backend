import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../../entities/CrawlV2";
import * as Sentry from "@sentry/node";
import {SnapShot} from "../../entities/NodeSnapShot";
import {injectable} from "inversify";

type Entity = Node|Organization;

@injectable()
export default abstract class SnapShotterTemplate {

    async updateOrCreateSnapShots(entities: Entity[], crawl: CrawlV2):Promise<SnapShot[]> {
        let activeSnapShots = await this.findActiveSnapShots();
        activeSnapShots = await this.updateActiveSnapShots(activeSnapShots, entities, crawl);
        let entitiesWithoutSnapShots = this.getEntitiesWithoutSnapShots(activeSnapShots, entities);
        console.log("[SnapShotter]: newly detected entities: " + entitiesWithoutSnapShots);
        let newSnapShots = await this.createSnapShots(entitiesWithoutSnapShots, crawl);

        return [...activeSnapShots, ...newSnapShots];
    }

    protected async updateActiveSnapShots(activeSnapShots: SnapShot[], entities: Entity[], crawl: CrawlV2) {
        let entityMap = this.getIdToEntityMap(entities);
        let newActiveSnapShots: SnapShot[] = [];
        for (let snapShot of activeSnapShots) {
            try {
                let entity = this.getEntityConnectedToSnapShot(snapShot, entityMap);
                if (entity) {
                    let updatedEntity = await this.updateActiveSnapShot(snapShot, entity, crawl);
                    newActiveSnapShots.push(updatedEntity);
                } else {
                    snapShot.endDate = crawl.time; //node changed public key
                    await this.saveSnapShot(snapShot);
                }
            } catch (e) {
                console.log(e); //todo winston
                Sentry.captureException(e);
            }
        }

        return newActiveSnapShots;
    }

    protected async updateActiveSnapShot(activeSnapShot: SnapShot, entity: Entity, crawl: CrawlV2) {
        if (this.hasEntityChanged(activeSnapShot, entity)) {
            return await this.createUpdatedSnapShot(activeSnapShot, entity, crawl);
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
        for(let entityWithoutSnapShot of entitiesWithoutSnapShots){
            try {
                let snapShot = await this.createSnapShot(entityWithoutSnapShot, crawl);
                if(snapShot)
                    newSnapShots.push(snapShot);
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }

        return newSnapShots;
    }

    abstract findActiveSnapShots(): Promise<SnapShot[]>;
    protected abstract getIdToEntityMap(entities: Entity[]): Map<string, Entity>;
    protected abstract getIdToSnapShotMap(snapShots: SnapShot[]): Map<string, SnapShot>;
    protected abstract getEntityConnectedToSnapShot(snapShot: SnapShot, idToEntityMap: Map<string, Entity>): Entity|undefined;
    protected abstract getSnapShotConnectedToEntity(entity: Entity, idToSnapShotMap: Map<string, SnapShot>): SnapShot|undefined;
    protected abstract hasEntityChanged(snapShot: SnapShot, entity: Entity): boolean;
    protected abstract createUpdatedSnapShot(snapShot: SnapShot, entity: Entity, crawl: CrawlV2): Promise<SnapShot>;
    protected abstract createSnapShot(entity: Entity, crawl: CrawlV2): Promise<SnapShot|undefined>;
    protected abstract saveSnapShot(snapShot: SnapShot):Promise<SnapShot>;
}