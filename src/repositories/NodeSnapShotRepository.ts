import {EntityRepository, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";
import { IsNull } from "typeorm";
import {SnapShotRepository} from "./OrganizationSnapShotRepository";

@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> implements SnapShotRepository{

    /**
     * Node SnapShots that are active (not archived).
     */
    async findActive(): Promise<NodeSnapShot[]> {
        return await this.find({where: {_endCrawl: IsNull()}});
    }
}