import { injectable } from 'inversify';
import * as stellar_analysis from '@stellarbeat/stellar_analysis_nodejs/stellar_analysis';
import { err, ok, Result } from 'neverthrow';
import 'reflect-metadata';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';

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

export interface FBASAnalysisQuorumSet {
	threshold: number;
	validators: string[];
	innerQuorumSets: FBASAnalysisQuorumSet[];
}

export interface FbasAnalysisNode {
	publicKey: PublicKey;
	name: string | null;
	quorumSet: FBASAnalysisQuorumSet | null;
	geoData: {
		countryName: string | null;
	} | null;
	isp: string | null;
}

export interface FbasAnalysisOrganization {
	id: string;
	name: string | null;
	validators: PublicKey[];
}

export enum MergeBy {
	ORGANIZATION = 'ORGANIZATION',
	COUNTRY = 'COUNTRY',
	ISP = 'ISP'
}

type PublicKey = string;

@injectable()
export default class FbasAnalyzerFacade {
	analyzeTopTier(
		nodes: FbasAnalysisNode[],
		organizations: FbasAnalysisOrganization[],
		mergeBy: MergeBy | null
	): Result<TopTierAnalysis, Error> {
		try {
			const nodesJSON = JSON.stringify(nodes);
			const organizationsJSON = JSON.stringify(organizations);

			return ok(
				stellar_analysis.analyze_top_tier(
					nodesJSON,
					organizationsJSON,
					this.mapToMergeBy(mergeBy)
				)
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	analyzeSymmetricTopTier(
		nodes: FbasAnalysisNode[],
		organizations: FbasAnalysisOrganization[],
		mergeBy: MergeBy | null
	): Result<SymmetricTopTierAnalysis, Error> {
		try {
			const nodesJSON = JSON.stringify(nodes);
			const organizationsJSON = JSON.stringify(organizations);

			return ok(
				stellar_analysis.analyze_symmetric_top_tier(
					nodesJSON,
					organizationsJSON,
					this.mapToMergeBy(mergeBy)
				)
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	analyzeBlockingSets(
		nodes: FbasAnalysisNode[],
		faultyNodes: PublicKey[],
		organizations: FbasAnalysisOrganization[],
		mergeBy: MergeBy | null
	): Result<BlockingSetsAnalysis, Error> {
		try {
			const nodesJSON = JSON.stringify(nodes);
			const faultyNodesJSON = JSON.stringify(faultyNodes);
			const organizationsJSON = JSON.stringify(organizations);

			return ok(
				stellar_analysis.analyze_minimal_blocking_sets(
					nodesJSON,
					organizationsJSON,
					faultyNodesJSON,
					this.mapToMergeBy(mergeBy)
				)
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	analyzeSplittingSets(
		nodes: FbasAnalysisNode[],
		organizations: FbasAnalysisOrganization[],
		mergeBy: MergeBy | null
	): Result<SplittingSetsAnalysis, Error> {
		try {
			const nodesJSON = JSON.stringify(nodes);
			const organizationsJSON = JSON.stringify(organizations);

			return ok(
				stellar_analysis.analyze_minimal_splitting_sets(
					nodesJSON,
					organizationsJSON,
					this.mapToMergeBy(mergeBy)
				)
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	analyzeMinimalQuorums(
		nodes: FbasAnalysisNode[],
		organizations: FbasAnalysisOrganization[],
		mergeBy: MergeBy | null
	): Result<MinimalQuorumsAnalysis, Error> {
		try {
			const nodesJSON = JSON.stringify(nodes);
			const organizationsJSON = JSON.stringify(organizations);

			return ok(
				stellar_analysis.analyze_minimal_quorums(
					nodesJSON,
					organizationsJSON,
					this.mapToMergeBy(mergeBy)
				)
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	private mapToMergeBy = (
		mergeBy: MergeBy | null
	): stellar_analysis.MergeBy => {
		switch (mergeBy) {
			case MergeBy.ORGANIZATION:
				return stellar_analysis.MergeBy.Orgs;
			case MergeBy.COUNTRY:
				return stellar_analysis.MergeBy.Countries;
			case MergeBy.ISP:
				return stellar_analysis.MergeBy.ISPs;
			default:
				return stellar_analysis.MergeBy.DoNotMerge;
		}
	};

	/*async performAnalysis(
		nodes: FbasAnalysisNode[],
		faultyNodes: PublicKey[],
		organizations: FbasAnalysisOrganization[]
	): Promise<Result<AnalysisResult, Error>> {
		try {
			/*const nodesToAnalyze = JSON.stringify(
				network.nodes.filter(
					(node) =>
						node.isValidator &&
						this.isNodeCorrectlyConfigured(node) &&
						(network.nodesTrustGraph.isVertexPartOfNetworkTransitiveQuorumSet(
								node.publicKey
							) ||
							!network.nodesTrustGraph.hasNetworkTransitiveQuorumSet())
				)
			);

			const nodesJSON = JSON.stringify(nodes);
			const organizationsJSON = JSON.stringify(organizations);
			const faultyNodesJSON = JSON.stringify(faultyNodes);

			const blockingSetsAnalysis: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					nodesJSON,
					organizationsJSON,
					JSON.stringify([]),
					stellar_analysis.MergeBy.DoNotMerge
				);

			const blockingSetsAnalysisFiltered: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					nodesJSON,
					organizationsJSON,
					faultyNodesJSON,
					stellar_analysis.MergeBy.DoNotMerge
				);

			const orgBlockingSetsAnalysis: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					nodesJSON,
					organizationsJSON,
					JSON.stringify([]),
					stellar_analysis.MergeBy.Orgs
				);

			const orgBlockingSetsAnalysisFiltered: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					nodesJSON,
					organizationsJSON,
					faultyNodesJSON,
					stellar_analysis.MergeBy.Orgs
				);

			const countryBlockingSetsAnalysis: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					nodesJSON,
					organizationsJSON,
					JSON.stringify([]),
					stellar_analysis.MergeBy.Countries
				);

			const countryBlockingSetsAnalysisFiltered: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					nodesJSON,
					organizationsJSON,
					faultyNodesJSON,
					stellar_analysis.MergeBy.Countries
				);

			const ispBlockingSetsAnalysis: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					nodesJSON,
					organizationsJSON,
					JSON.stringify([]),
					stellar_analysis.MergeBy.ISPs
				);

			const ispBlockingSetsAnalysisFiltered: BlockingSetsAnalysis =
				stellar_analysis.analyze_minimal_blocking_sets(
					nodesJSON,
					organizationsJSON,
					faultyNodesJSON,
					stellar_analysis.MergeBy.ISPs
				);

			const splittingSetsAnalysis: SplittingSetsAnalysis =
				stellar_analysis.analyze_minimal_splitting_sets(
					nodesJSON,
					organizationsJSON,
					stellar_analysis.MergeBy.DoNotMerge
				);

			const orgSplittingSetsAnalysis: SplittingSetsAnalysis =
				stellar_analysis.analyze_minimal_splitting_sets(
					nodesJSON,
					organizationsJSON,
					stellar_analysis.MergeBy.Orgs
				);

			const countrySplittingSetsAnalysis: SplittingSetsAnalysis =
				stellar_analysis.analyze_minimal_splitting_sets(
					nodesJSON,
					organizationsJSON,
					stellar_analysis.MergeBy.Countries
				);

			const ispSplittingSetsAnalysis: SplittingSetsAnalysis =
				stellar_analysis.analyze_minimal_splitting_sets(
					nodesJSON,
					organizationsJSON,
					stellar_analysis.MergeBy.ISPs
				);

			const minimalQuorums: MinimalQuorumsAnalysis =
				stellar_analysis.analyze_minimal_quorums(
					nodesJSON,
					organizationsJSON,
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
	}*/

	/**isNodeCorrectlyConfigured(node: NodeDTO): boolean {
		return !(
			node.quorumSet.validators.length === 1 &&
			node.publicKey === node.quorumSet.validators[0] &&
			node.quorumSet.innerQuorumSets.length === 0
		);
	}*/
}
