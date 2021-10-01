import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { injectable } from 'inversify';
import * as stellar_analysis from '@stellarbeat/stellar_analysis_nodejs/stellar_analysis';
import { err, ok, Result } from 'neverthrow';

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

interface TopTierAnalysis {
	top_tier: string[];
	top_tier_size: number;
	cache_hit: boolean;
}

interface SymmetricTopTierAnalysis {
	symmetric_top_tier: {
		threshold: number;
		validators: string[];
		innerQuorumSets:
			| {
					threshold: number;
					validators: string[];
			  }[]
			| null;
	};
}

interface BlockingSetsAnalysis {
	result: Array<Array<string>>;
	min: number;
	size: number;
}

interface SplittingSetsAnalysis {
	result: Array<Array<string>>;
	min: number;
	size: number;
}

interface MinimalQuorumsAnalysis {
	result: Array<Array<string>>;
	size: number;
	min: number;
	quorum_intersection: boolean;
}

@injectable()
export default class FbasAnalyzerService {
	//todo: move to domain
	async performAnalysis(
		network: Network
	): Promise<Result<AnalysisResult, Error>> {
		try {
			let faultyNodes = JSON.stringify(
				network.nodes
					.filter((node) => network.isNodeFailing(node))
					.map((node) => node.publicKey)
			);

			let correctlyConfiguredNodes = JSON.stringify(
				network.nodes.filter(
					(node) => node.isValidator && this.isNodeCorrectlyConfigured(node)
				)
			);
			let organizations = JSON.stringify(network.organizations);

			let topTierAnalysis: TopTierAnalysis = stellar_analysis.analyze_top_tier(
				correctlyConfiguredNodes,
				organizations,
				stellar_analysis.MergeBy.DoNotMerge
			);
			let cacheHit = topTierAnalysis.cache_hit; //set on first sub analysis

			let symmetricTopTierAnalysis: SymmetricTopTierAnalysis =
				stellar_analysis.analyze_symmetric_top_tier(
					correctlyConfiguredNodes,
					organizations,
					stellar_analysis.MergeBy.DoNotMerge
				);

			let topTierOrganizationAnalysis: TopTierAnalysis =
				stellar_analysis.analyze_top_tier(
					correctlyConfiguredNodes,
					organizations,
					stellar_analysis.MergeBy.Orgs
				);

			let blockingSetsAnalysis: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					correctlyConfiguredNodes,
					organizations,
					JSON.stringify([]),
					stellar_analysis.MergeBy.DoNotMerge
				);

			let blockingSetsAnalysisFiltered: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					correctlyConfiguredNodes,
					organizations,
					faultyNodes,
					stellar_analysis.MergeBy.DoNotMerge
				);

			let orgBlockingSetsAnalysis: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					correctlyConfiguredNodes,
					organizations,
					JSON.stringify([]),
					stellar_analysis.MergeBy.Orgs
				);

			let orgBlockingSetsAnalysisFiltered: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					correctlyConfiguredNodes,
					organizations,
					faultyNodes,
					stellar_analysis.MergeBy.Orgs
				);

			let countryBlockingSetsAnalysis: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					correctlyConfiguredNodes,
					organizations,
					JSON.stringify([]),
					stellar_analysis.MergeBy.Countries
				);

			let countryBlockingSetsAnalysisFiltered: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					correctlyConfiguredNodes,
					organizations,
					faultyNodes,
					stellar_analysis.MergeBy.Countries
				);

			let ispBlockingSetsAnalysis: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					correctlyConfiguredNodes,
					organizations,
					JSON.stringify([]),
					stellar_analysis.MergeBy.ISPs
				);

			let ispBlockingSetsAnalysisFiltered: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					correctlyConfiguredNodes,
					organizations,
					faultyNodes,
					stellar_analysis.MergeBy.ISPs
				);

			let splittingSetsAnalysis: SplittingSetsAnalysis =
				stellar_analysis.analyze_minimal_splitting_sets(
					correctlyConfiguredNodes,
					organizations,
					stellar_analysis.MergeBy.DoNotMerge
				);

			let orgSplittingSetsAnalysis: SplittingSetsAnalysis =
				stellar_analysis.analyze_minimal_splitting_sets(
					correctlyConfiguredNodes,
					organizations,
					stellar_analysis.MergeBy.Orgs
				);

			let countrySplittingSetsAnalysis: SplittingSetsAnalysis =
				stellar_analysis.analyze_minimal_splitting_sets(
					correctlyConfiguredNodes,
					organizations,
					stellar_analysis.MergeBy.Countries
				);

			let ispSplittingSetsAnalysis: SplittingSetsAnalysis =
				stellar_analysis.analyze_minimal_splitting_sets(
					correctlyConfiguredNodes,
					organizations,
					stellar_analysis.MergeBy.ISPs
				);

			let minimalQuorums: MinimalQuorumsAnalysis =
				stellar_analysis.analyze_minimal_quorums(
					correctlyConfiguredNodes,
					organizations,
					stellar_analysis.MergeBy.DoNotMerge
				);

			return ok({
				cacheHit: cacheHit,
				hasSymmetricTopTier:
					symmetricTopTierAnalysis.symmetric_top_tier !== null,
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
		} catch (error) {
			if (error instanceof Error) {
				return err(new Error('Wasm analysis failed: ' + error.message));
			}

			return err(new Error('Wasm analysis failed'));
		}
	}

	isNodeCorrectlyConfigured(node: Node) {
		if (
			node.quorumSet.validators.length === 1 &&
			node.publicKey === node.quorumSet.validators[0] &&
			node.quorumSet.innerQuorumSets.length === 0
		)
			return false;

		return true;
	}
}
