import { AnalysisMergedResult } from './AnalysisMergedResult';

export interface AnalysisResult {
	hasQuorumIntersection: boolean;
	hasSymmetricTopTier: boolean;
	node: AnalysisMergedResult;
	organization: AnalysisMergedResult;
	isp: AnalysisMergedResult;
	country: AnalysisMergedResult;
}
