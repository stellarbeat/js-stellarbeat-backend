import {EntityRepository, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";

@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> {

    async findLatest(): Promise<NodeSnapShot[]> {
        return await this.find({
            where: {
                endDate: NodeSnapShot.MAX_DATE
            }})
    }
}