import {EntityRepository, Repository} from "typeorm";
import { IsNull } from "typeorm";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import {SnapShot} from "../entities/NodeSnapShot";

export interface SnapShotRepository {
    findActive(): Promise<SnapShot[]>
}
@EntityRepository(OrganizationSnapShot)
export default class OrganizationSnapShotRepository extends Repository<OrganizationSnapShot> implements SnapShotRepository{

    /**
     * Organization SnapShots that are active (not archived).
     */
    async findActive(): Promise<OrganizationSnapShot[]> {
        return await this.find({
            where: {_endCrawl: IsNull()}
        });
    }
}