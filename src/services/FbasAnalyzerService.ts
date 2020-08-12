import {Network} from "@stellarbeat/js-stellar-domain";
const {FbasAnalyzer} = require('@stellarbeat/fbas_analyzer_nodejs');

interface IFbasAnalyzer {
    analyze(
        nodesJson: string,
        faultyNodes: string[],
        organizationsJson: string
    ): AnalysisResult;
}

interface AnalysisResult {
    cache_hit: boolean;
    has_quorum_intersection: boolean;
    has_quorum_intersection_faulty_nodes_filtered: boolean;
    minimal_blocking_sets:string[][];
    minimal_blocking_sets_faulty_nodes_filtered:string[][];
    org_minimal_blocking_sets:string[][];
    org_minimal_blocking_sets_faulty_nodes_filtered:string[][];
    minimal_splitting_sets:string[][];
    minimal_splitting_sets_faulty_nodes_filtered:string[][];
    org_minimal_splitting_sets:string[][];
    org_minimal_splitting_sets_faulty_nodes_filtered:string[][];
    top_tier:string[];
    top_tier_faulty_nodes_filtered:string[];
    org_top_tier:string[];
    org_top_tier_faulty_nodes_filtered:string[];
}

export default class FbasAnalyzerService {
    protected fbasAnalyzer:IFbasAnalyzer = new FbasAnalyzer();

    performAndSaveAnalysis(network: Network){
        let result = this.fbasAnalyzer.analyze(
            JSON.stringify(network.nodes),
            network.nodes.filter(node => network.isNodeFailing(node)).map(node => node.publicKey),
            JSON.stringify(network.organizations)
        );

        console.log(result);
    }

}