import {NodeStatisticRepository} from "../repositories/NodeStatisticRepository";
import {Node} from "@stellarbeat/js-stellar-domain";
import NodeStatistic from "../entities/NodeStatistic";

export class NodeStatisticService {
    protected _nodeStatisticRepository:NodeStatisticRepository;

    constructor(nodeStatisticsRepository: NodeStatisticRepository){
        this._nodeStatisticRepository = nodeStatisticsRepository;
    }

    public async processNodes(nodes:Node[]){
        for (let node of nodes) {
            let nodeStatistic = new NodeStatistic(node.publicKey);
            nodeStatistic.isActive = node.active;
            nodeStatistic.isOverloaded = node.overLoaded;
            nodeStatistic.isValidating = node.isValidating;
            await this._nodeStatisticRepository.save(nodeStatistic);
        }
    }
}