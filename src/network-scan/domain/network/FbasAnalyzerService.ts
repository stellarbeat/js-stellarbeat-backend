import { Network, Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared';
import { injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import 'reflect-metadata';
import FbasAnalyzerFacade, { MergeBy } from './FbasAnalyzerFacade';

export interface AnalysisResult {
	cacheHit: boolean;
	hasQuorumIntersection: boolean;
	minimalBlockingSets: string[][];
	minimalBlockingSetsMinSize: number;
	minimalBlockingSetsFaultyNodesFiltered: string[][];
	minimalBlockingSetsFaultyNodesFilteredMinSize: number;
	orgMinimalBlockingSets: string[][];
	orgMinimalBlockingSetsMinSize: number;
	orgMinimalBlockingSetsFaultyNodesFiltered: string[][];
	orgMinimalBlockingSetsFaultyNodesFilteredMinSize: number;
	ispMinimalBlockingSets: string[][];
	ispMinimalBlockingSetsMinSize: number;
	ispMinimalBlockingSetsFaultyNodesFiltered: string[][];
	ispMinimalBlockingSetsFaultyNodesFilteredMinSize: number;
	countryMinimalBlockingSets: string[][];
	countryMinimalBlockingSetsMinSize: number;
	countryMinimalBlockingSetsFaultyNodesFiltered: string[][];
	countryMinimalBlockingSetsFaultyNodesFilteredMinSize: number;
	minimalSplittingSets: string[][];
	minimalSplittingSetsMinSize: number;
	orgMinimalSplittingSets: string[][];
	orgMinimalSplittingSetsMinSize: number;
	countryMinimalSplittingSets: string[][];
	countryMinimalSplittingSetsMinSize: number;
	ispMinimalSplittingSets: string[][];
	ispMinimalSplittingSetsMinSize: number;
	topTier: string[];
	topTierSize: number;
	orgTopTier: string[];
	orgTopTierSize: number;
	hasSymmetricTopTier: boolean;
}

@injectable()
export default class FbasAnalyzerService {
	constructor(private analysisFacade: FbasAnalyzerFacade) {}

	async performAnalysis(
		network: Network
	): Promise<Result<AnalysisResult, Error>> {
		const faultyNodes = network.nodes
			.filter((node) => network.isNodeFailing(node))
			.map((node) => node.publicKey);

		const nodesToAnalyze = network.nodes.filter(
			(node) =>
				node.isValidator &&
				this.isNodeCorrectlyConfigured(node) &&
				(network.nodesTrustGraph.isVertexPartOfNetworkTransitiveQuorumSet(
					node.publicKey
				) ||
					!network.nodesTrustGraph.hasNetworkTransitiveQuorumSet())
		);

		const organizations = network.organizations;

		const topTierAnalysisResult = this.analysisFacade.analyzeTopTier(
			nodesToAnalyze,
			organizations,
			null
		);

		if (topTierAnalysisResult.isErr()) {
			return err(topTierAnalysisResult.error);
		}
		const topTierAnalysis = topTierAnalysisResult.value;

		const cacheHit = topTierAnalysis.cache_hit; //set on first sub analysis

		const symmetricTopTierAnalysisResult =
			this.analysisFacade.analyzeSymmetricTopTier(
				nodesToAnalyze,
				organizations,
				null
			);
		if (symmetricTopTierAnalysisResult.isErr()) {
			return err(symmetricTopTierAnalysisResult.error);
		}
		const symmetricTopTierAnalysis = symmetricTopTierAnalysisResult.value;

		const topTierOrgAnalysisResult = this.analysisFacade.analyzeTopTier(
			nodesToAnalyze,
			organizations,
			MergeBy.ORGANIZATION
		);
		if (topTierOrgAnalysisResult.isErr()) {
			return err(topTierOrgAnalysisResult.error);
		}

		const topTierOrganizationAnalysis = topTierOrgAnalysisResult.value;

		const blockingSetsAnalysisResult = this.analysisFacade.analyzeBlockingSets(
			nodesToAnalyze,
			[],
			organizations,
			null
		);
		if (blockingSetsAnalysisResult.isErr()) {
			return err(blockingSetsAnalysisResult.error);
		}
		const blockingSetsAnalysis = blockingSetsAnalysisResult.value;

		const blockingSetsAnalysisFilteredResult =
			this.analysisFacade.analyzeBlockingSets(
				nodesToAnalyze,
				faultyNodes,
				organizations,
				null
			);
		if (blockingSetsAnalysisFilteredResult.isErr()) {
			return err(blockingSetsAnalysisFilteredResult.error);
		}

		const blockingSetsAnalysisFiltered =
			blockingSetsAnalysisFilteredResult.value;

		const orgBlockingSetsAnalysisResult =
			this.analysisFacade.analyzeBlockingSets(
				nodesToAnalyze,
				[],
				organizations,
				MergeBy.ORGANIZATION
			);

		if (orgBlockingSetsAnalysisResult.isErr()) {
			return err(orgBlockingSetsAnalysisResult.error);
		}
		const orgBlockingSetsAnalysis = orgBlockingSetsAnalysisResult.value;

		const orgBlockingSetsAnalysisFilteredResult =
			this.analysisFacade.analyzeBlockingSets(
				nodesToAnalyze,
				faultyNodes,
				organizations,
				MergeBy.ORGANIZATION
			);

		if (orgBlockingSetsAnalysisFilteredResult.isErr()) {
			return err(orgBlockingSetsAnalysisFilteredResult.error);
		}

		const orgBlockingSetsAnalysisFiltered =
			orgBlockingSetsAnalysisFilteredResult.value;

		const countryBlockingSetsAnalysisResult =
			this.analysisFacade.analyzeBlockingSets(
				nodesToAnalyze,
				[],
				organizations,
				MergeBy.COUNTRY
			);

		if (countryBlockingSetsAnalysisResult.isErr()) {
			return err(countryBlockingSetsAnalysisResult.error);
		}

		const countryBlockingSetsAnalysis = countryBlockingSetsAnalysisResult.value;

		const countryBlockingSetsAnalysisFilteredResult =
			this.analysisFacade.analyzeBlockingSets(
				nodesToAnalyze,
				faultyNodes,
				organizations,
				MergeBy.COUNTRY
			);

		if (countryBlockingSetsAnalysisFilteredResult.isErr()) {
			return err(countryBlockingSetsAnalysisFilteredResult.error);
		}

		const countryBlockingSetsAnalysisFiltered =
			countryBlockingSetsAnalysisFilteredResult.value;

		const ispBlockingSetsAnalysisResult =
			this.analysisFacade.analyzeBlockingSets(
				nodesToAnalyze,
				[],
				organizations,
				MergeBy.ISP
			);

		if (ispBlockingSetsAnalysisResult.isErr()) {
			return err(ispBlockingSetsAnalysisResult.error);
		}

		const ispBlockingSetsAnalysis = ispBlockingSetsAnalysisResult.value;

		const ispBlockingSetsAnalysisFilteredResult =
			this.analysisFacade.analyzeBlockingSets(
				nodesToAnalyze,
				faultyNodes,
				organizations,
				MergeBy.ISP
			);

		if (ispBlockingSetsAnalysisFilteredResult.isErr()) {
			return err(ispBlockingSetsAnalysisFilteredResult.error);
		}

		const ispBlockingSetsAnalysisFiltered =
			ispBlockingSetsAnalysisFilteredResult.value;

		const splittingSetsAnalysisResult =
			this.analysisFacade.analyzeSplittingSets(
				nodesToAnalyze,
				organizations,
				null
			);
		if (splittingSetsAnalysisResult.isErr()) {
			return err(splittingSetsAnalysisResult.error);
		}
		const splittingSetsAnalysis = splittingSetsAnalysisResult.value;

		const orgSplittingSetsAnalysisResult =
			this.analysisFacade.analyzeSplittingSets(
				nodesToAnalyze,
				organizations,
				MergeBy.ORGANIZATION
			);
		if (orgSplittingSetsAnalysisResult.isErr()) {
			return err(orgSplittingSetsAnalysisResult.error);
		}
		const orgSplittingSetsAnalysis = orgSplittingSetsAnalysisResult.value;

		const countrySplittingSetsAnalysisResult =
			this.analysisFacade.analyzeSplittingSets(
				nodesToAnalyze,
				organizations,
				MergeBy.COUNTRY
			);

		if (countrySplittingSetsAnalysisResult.isErr()) {
			return err(countrySplittingSetsAnalysisResult.error);
		}
		const countrySplittingSetsAnalysis =
			countrySplittingSetsAnalysisResult.value;

		const ispSplittingSetsAnalysisResult =
			this.analysisFacade.analyzeSplittingSets(
				nodesToAnalyze,
				organizations,
				MergeBy.ISP
			);

		if (ispSplittingSetsAnalysisResult.isErr()) {
			return err(ispSplittingSetsAnalysisResult.error);
		}

		const ispSplittingSetsAnalysis = ispSplittingSetsAnalysisResult.value;

		const minimalQuorumsAnalysisResult =
			this.analysisFacade.analyzeMinimalQuorums(
				nodesToAnalyze,
				organizations,
				null
			);
		if (minimalQuorumsAnalysisResult.isErr()) {
			return err(minimalQuorumsAnalysisResult.error);
		}
		const minimalQuorums = minimalQuorumsAnalysisResult.value;

		return ok({
			cacheHit: cacheHit,
			hasSymmetricTopTier: symmetricTopTierAnalysis.symmetric_top_tier !== null,
			topTier: topTierAnalysis.top_tier,
			topTierSize: topTierAnalysis.top_tier_size,
			orgTopTier: topTierOrganizationAnalysis.top_tier,
			orgTopTierSize: topTierOrganizationAnalysis.top_tier_size,
			minimalBlockingSets: blockingSetsAnalysis.result,
			minimalBlockingSetsMinSize: blockingSetsAnalysis.min,
			minimalBlockingSetsFaultyNodesFiltered:
				blockingSetsAnalysisFiltered.result,
			minimalBlockingSetsFaultyNodesFilteredMinSize:
				blockingSetsAnalysisFiltered.min,
			orgMinimalBlockingSets: orgBlockingSetsAnalysis.result,
			orgMinimalBlockingSetsMinSize: orgBlockingSetsAnalysis.min,
			orgMinimalBlockingSetsFaultyNodesFiltered:
				orgBlockingSetsAnalysisFiltered.result,
			orgMinimalBlockingSetsFaultyNodesFilteredMinSize:
				orgBlockingSetsAnalysisFiltered.min,
			countryMinimalBlockingSets: countryBlockingSetsAnalysis.result,
			countryMinimalBlockingSetsMinSize: countryBlockingSetsAnalysis.min,
			countryMinimalBlockingSetsFaultyNodesFiltered:
				countryBlockingSetsAnalysisFiltered.result,
			countryMinimalBlockingSetsFaultyNodesFilteredMinSize:
				countryBlockingSetsAnalysisFiltered.min,
			ispMinimalBlockingSets: ispBlockingSetsAnalysis.result,
			ispMinimalBlockingSetsMinSize: ispBlockingSetsAnalysis.min,
			ispMinimalBlockingSetsFaultyNodesFiltered:
				ispBlockingSetsAnalysisFiltered.result,
			ispMinimalBlockingSetsFaultyNodesFilteredMinSize:
				ispBlockingSetsAnalysisFiltered.min,
			minimalSplittingSets: splittingSetsAnalysis.result,
			minimalSplittingSetsMinSize: splittingSetsAnalysis.min,
			orgMinimalSplittingSets: orgSplittingSetsAnalysis.result,
			orgMinimalSplittingSetsMinSize: orgSplittingSetsAnalysis.min,
			countryMinimalSplittingSets: countrySplittingSetsAnalysis.result,
			countryMinimalSplittingSetsMinSize: countrySplittingSetsAnalysis.min,
			ispMinimalSplittingSets: ispSplittingSetsAnalysis.result,
			ispMinimalSplittingSetsMinSize: ispSplittingSetsAnalysis.min,
			hasQuorumIntersection: minimalQuorums.quorum_intersection
		});
	}

	isNodeCorrectlyConfigured(node: NodeDTO): boolean {
		return !(
			node.quorumSet.validators.length === 1 &&
			node.publicKey === node.quorumSet.validators[0] &&
			node.quorumSet.innerQuorumSets.length === 0
		);
	}
}
