import {NodeMeasurementAggregationRepository} from "../../repositories/NodeMeasurementAggregationRepository";
import {PublicKey} from "@stellarbeat/js-stellar-domain";

export default class AggregationService {
    protected readonly aggregationRepository: NodeMeasurementAggregationRepository;

    constructor(aggregationRepository: NodeMeasurementAggregationRepository) {
        this.aggregationRepository = aggregationRepository;
    }

    getNodeMeasurementAggregation(
        publicKey: PublicKey)
    {
        return this.aggregationRepository.findBy(publicKey);
    }
}