import {EntityRepository, Repository} from "typeorm";
import { IsNull } from "typeorm";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import {SnapShotUniqueIdentifier} from "../entities/NodePublicKeyStorage";

@EntityRepository(OrganizationSnapShot)
export default class OrganizationSnapShotRepository extends Repository<OrganizationSnapShot> {

    /**
     * Organization SnapShots that are active (not archived).
     */
    async findActive(): Promise<OrganizationSnapShot[]> {
        return await this.find({where: {endCrawl: IsNull()}});
    }

    /**
     * Organization SnapShots that are archived.
     */
    async findArchived(identifier: SnapShotUniqueIdentifier): Promise<OrganizationSnapShot | undefined> {
        return await this.createQueryBuilder('organization_snap_shot')
            .innerJoinAndSelect("organization_snap_shot.organizationId", "organization_id","organization_id.organization_id = :organizationId", {organizationId: identifier} )
            .where('organization_snap_shot.current = true')
            .andWhere('organization_snap_shot.endCrawl is not null')
            .getOne()
    }
}