import {EntityRepository, Repository} from "typeorm";
import NodeMeasurement from "../entities/NodeMeasurement";
import NodeMeasurementAggregation from "../entities/NodeMeasurementAggregation";
import {PublicKey} from "@stellarbeat/js-stellar-domain";

@EntityRepository(NodeMeasurementAggregation)
export class NodeMeasurementAggregationRepository extends Repository<NodeMeasurement> {

    findBy(publicKey: PublicKey) {
        return this.findOne({publicKey});
    }
}