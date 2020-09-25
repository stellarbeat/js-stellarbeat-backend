import {Network, Node} from "@stellarbeat/js-stellar-domain";
import {injectable} from "inversify";
const {FbasAnalyzer} = require('@stellarbeat/fbas_analyzer_nodejs');

interface IFbasAnalyzer {
    analyze(
        nodesJson: string,
        faultyNodes: string[],
        organizationsJson: string
    ): AnalysisResult;
}

export interface AnalysisResult {
    cache_hit: boolean;
    has_quorum_intersection: boolean;
    has_quorum_intersection_malicious_nodes_filtered: boolean;
    minimal_blocking_sets:string[][];
    minimal_blocking_sets_faulty_nodes_filtered:string[][];
    org_minimal_blocking_sets:string[][];
    org_minimal_blocking_sets_faulty_nodes_filtered:string[][];
    minimal_splitting_sets:string[][];
    minimal_splitting_sets_malicious_nodes_filtered:string[][];
    org_minimal_splitting_sets:string[][];
    org_minimal_splitting_sets_malicious_nodes_filtered:string[][];
    top_tier:string[];
    top_tier_faulty_nodes_filtered:string[];
    org_top_tier:string[];
    org_top_tier_faulty_nodes_filtered:string[];
}

@injectable()
export default class FbasAnalyzerService {
    protected fbasAnalyzer:IFbasAnalyzer = new FbasAnalyzer();

    performAnalysis(network: Network){
        let faultyNodes = network.nodes
            .filter(node => network.isNodeFailing(node))
            .map(node => node.publicKey);

        let correctlyConfiguredNodes = network.nodes.filter(node => this.isNodeCorrectlyConfigured(node));

        let result = this.fbasAnalyzer.analyze(
            JSON.stringify(correctlyConfiguredNodes),
            faultyNodes,
            JSON.stringify(network.organizations)
        );

        return result;
    }

    isNodeCorrectlyConfigured(node:Node){
        if(node.quorumSet.validators.length === 1
            && node.publicKey === node.quorumSet.validators[0]
            && node.quorumSet.innerQuorumSets.length === 0)
            return false;

        return true;
    }

}