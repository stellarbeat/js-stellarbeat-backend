import {EntityRepository, Repository} from "typeorm";
import NodeStatistic from "../entities/NodeStatistic";

@EntityRepository(NodeStatistic)
export class NodeStatisticRepository extends Repository<NodeStatistic> {

    /*findByName(firstName: string, lastName: string) {
        return this.findOne({ firstName, lastName });
    }*/

}