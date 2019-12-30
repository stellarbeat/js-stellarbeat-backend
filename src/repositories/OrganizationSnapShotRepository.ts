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

    async findOrganizationsWithoutActiveValidators(): Promise<OrganizationSnapShot[]> {
        return this.createQueryBuilder('OrganizationSnapShot')
            .innerJoin('organization_snap_shot_validators_node_public_key', 'OrgRelNode',
                '"OrganizationSnapShot"."id" = "OrgRelNode"."organizationSnapShotId"')
            .leftJoin('node_snap_shot', 'NodeSnapShot',
                '"NodeSnapShot"."NodePublicKeyId" = "OrgRelNode"."nodePublicKeyId" ' +
                'AND "NodeSnapShot"."EndCrawlId" is null ' + //active snapshot
                'AND "NodeSnapShot"."QuorumSetId" is not null') //validator has quorumSet
            .where({_endCrawl: IsNull()})
            .having('"NodeSnapShot"."NodePublicKeyId" is null')
            .getRawMany();
    }
}