import {EntityRepository, Repository} from "typeorm";
import NodeStorageV2 from "../entities/NodeStorageV2";

@EntityRepository(NodeStorageV2)
export class NodeV2Repository extends Repository<NodeStorageV2> {

    async findNodesFromLatestCrawl():Promise<NodeStorageV2[]>{
        return await this.createQueryBuilder()
            .where("crawlEnd is null")
            .getMany();
    }
}