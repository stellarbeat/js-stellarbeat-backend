import {EntityRepository, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";
import { IsNull } from "typeorm";

@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> {

    /**
     * Node SnapShots that are active (not archived).
     */
    async findActive(): Promise<NodeSnapShot[]> {
        return await this.find({where: {_endCrawl: IsNull()}});
    }
}