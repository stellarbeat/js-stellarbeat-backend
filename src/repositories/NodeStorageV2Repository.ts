import {EntityRepository, Repository} from "typeorm";
import NodeStorageV2 from "../entities/NodeStorageV2";

@EntityRepository(NodeStorageV2)
export default class NodeStorageV2Repository extends Repository<NodeStorageV2> {

}