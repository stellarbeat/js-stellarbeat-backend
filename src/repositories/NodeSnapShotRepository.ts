import {EntityRepository, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";
import { IsNull } from "typeorm";
import {SnapShotRepository} from "./OrganizationSnapShotRepository";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";

@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> implements SnapShotRepository{

    /**
     * Node SnapShots that are active (not archived).
     */
    async findActive(): Promise<NodeSnapShot[]> {
        return await this.find({where: {_endCrawl: IsNull()}});
    }

    async findLatestEndCrawl(nodePublicKeyStorage: NodePublicKeyStorage): Promise<{latestCrawl: Date}>{
        return await this.createQueryBuilder('snap_shot')
            .select('MAX("endCrawl"."validFrom")', 'latestCrawl')
            .innerJoin("snap_shot._endCrawl", "endCrawl")
            .where('snap_shot._nodePublicKey = :nodePublicKeyId', {nodePublicKeyId: nodePublicKeyStorage.id})
            .getRawOne();
    }
}