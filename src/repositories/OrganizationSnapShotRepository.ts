import {EntityRepository, Repository} from "typeorm";
import { IsNull } from "typeorm";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";

@EntityRepository(OrganizationSnapShot)
export default class OrganizationSnapShotRepository extends Repository<OrganizationSnapShot> {

    /**
     * Organization SnapShots that are active (not archived).
     */
    async findActive(): Promise<OrganizationSnapShot[]> {
        return await this.find({
            where: {endCrawl: IsNull()},
            relations: ['_validators']
        });
    }
}