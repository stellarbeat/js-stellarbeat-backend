import {EntityRepository, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";
import { IsNull } from "typeorm";

@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> {

    async findLatest(): Promise<NodeSnapShot[]> {
        return await this.find({
            where: {
                crawlEnd: IsNull()
            }})
    }
}