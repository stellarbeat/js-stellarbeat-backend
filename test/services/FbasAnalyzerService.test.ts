import FbasAnalyzerService from "../../src/services/FbasAnalyzerService";
import {Network} from "@stellarbeat/js-stellar-domain";

describe("analyze fbas", () => {
    test("it should analyze", async () => {
        let fbasAnalyzerService = new FbasAnalyzerService();
        fbasAnalyzerService.performAndSaveAnalysis(new Network([]));
    });
});