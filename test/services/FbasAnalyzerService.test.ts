import "reflect-metadata";
import FbasAnalyzerService from "../../src/services/FbasAnalyzerService";
import {Network, Node, QuorumSet} from "@stellarbeat/js-stellar-domain";

describe("analyze fbas", () => {
    test("it should analyze", async () => {
        let fbasAnalyzerService = new FbasAnalyzerService();
        let result = fbasAnalyzerService.performAnalysis(new Network([]));

        expect(result).toHaveProperty('cache_hit');
    });

    test("it should filter out badly configured nodes", () => {
        let fbasAnalyzerService = new FbasAnalyzerService();
        let correctNode = new Node('A');
        correctNode.quorumSet.validators.push('A', 'B');
        expect(fbasAnalyzerService.isNodeCorrectlyConfigured(correctNode)).toBeTruthy();
        let correctNode2 = new Node( 'A');
        correctNode2.quorumSet.validators.push('A');
        correctNode2.quorumSet.innerQuorumSets.push(new QuorumSet("key"));
        expect(fbasAnalyzerService.isNodeCorrectlyConfigured(correctNode2)).toBeTruthy();
        let inCorrectNode = new Node('A');
        inCorrectNode.quorumSet.validators.push('A');
        expect(fbasAnalyzerService.isNodeCorrectlyConfigured(inCorrectNode)).toBeFalsy();
    })
});