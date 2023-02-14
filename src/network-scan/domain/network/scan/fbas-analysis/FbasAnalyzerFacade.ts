import { injectable } from 'inversify';
import * as stellar_analysis from '@stellarbeat/stellar_analysis_nodejs/stellar_analysis';
import { err, ok, Result } from 'neverthrow';
import 'reflect-metadata';
import { mapUnknownToError } from '../../../../../core/utilities/mapUnknownToError';

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

//todo: move to shared
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
}
