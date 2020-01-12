import {EntityRepository, In, LessThanOrEqual, MoreThan, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";
import {IsNull} from "typeorm";
import {SnapShotRepository} from "./OrganizationSnapShotRepository";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import CrawlV2 from "../entities/CrawlV2";

@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> implements SnapShotRepository {

    /**
     * Node SnapShots that are active (not archived).
     */
    async findActive(): Promise<NodeSnapShot[]> {
        return await this.find({where: {_endCrawl: IsNull()}});
    }

    async findActiveInCrawl(crawl: CrawlV2) {
        return await this.find({
            where: [
                {
                    _startCrawl: LessThanOrEqual(crawl),
                    _endCrawl: MoreThan(crawl)
                },
                {
                    _startCrawl: LessThanOrEqual(crawl),
                    _endCrawl: IsNull()
                }
                ]

        })
    }

    async findByPublicKeyStorageId(publicKeyStorageIds: number[]) {
        return await this.find({
            where: {
                _nodePublicKey: In(publicKeyStorageIds)
            }
        });
    }

    async findLatestEndCrawl(nodePublicKeyStorage: NodePublicKeyStorage): Promise<{ latestCrawl: Date }> {
        return await this.createQueryBuilder('snap_shot')
            .select('MAX("endCrawl"."validFrom")', 'latestCrawl')
            .innerJoin("snap_shot._endCrawl", "endCrawl")
            .where('snap_shot._nodePublicKey = :nodePublicKeyId', {nodePublicKeyId: nodePublicKeyStorage.id})
            .andWhere('"endCrawl"."completed" = true')
            .getRawOne();
    }
}