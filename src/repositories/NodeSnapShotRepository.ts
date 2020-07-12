import {EntityRepository, In, LessThanOrEqual, MoreThan, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";
import {SnapShotRepository} from "./OrganizationSnapShotRepository";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import {injectable} from "inversify";

@injectable()
@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> implements SnapShotRepository {

    /**
     * Node SnapShots that are active (not archived).
     */
    async findActive(): Promise<NodeSnapShot[]> {
        return await this.find({where: {endDate: NodeSnapShot.MAX_DATE}});
    }

    async findActiveAtTime(time: Date) {
        return await this.find({
            where:
                {
                    startDate: LessThanOrEqual(time),
                    endDate: MoreThan(time)
                }
        })
    }

    async findActiveByPublicKeyStorageId(publicKeyStorageIds: number[]) {
        return await this.find({
            where: {
                _nodePublicKey: In(publicKeyStorageIds),
                endDate: NodeSnapShot.MAX_DATE
            }
        });
    }

    async findLatestChangeDate(nodePublicKeyStorage: NodePublicKeyStorage): Promise<{ latestChangeDate: Date | undefined}> {
        return await this.createQueryBuilder('snap_shot')
            .select('MAX("snap_shot"."endDate")', 'latestChangeDate')
            .where('snap_shot._nodePublicKey = :nodePublicKeyId', {nodePublicKeyId: nodePublicKeyStorage.id})
            .getRawOne();
    }

    async findLatest(nodePublicKeyStorage: NodePublicKeyStorage, at: Date = new Date()) {
        // @ts-ignore
        return await this.find({
            where: {
                _nodePublicKey: nodePublicKeyStorage.id,
                startDate: LessThanOrEqual(at)
            },
            take: 10,
            order: {
                endDate: "DESC"
            },
        })
    }
}