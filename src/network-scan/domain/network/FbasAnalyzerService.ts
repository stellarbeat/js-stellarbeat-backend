import { Network, Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared';
import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import 'reflect-metadata';
import FbasAnalyzerFacade, {
	FbasAnalysisNode,
	FbasAnalysisOrganization,
	MergeBy
} from './FbasAnalyzerFacade';
import { Logger } from '../../../core/services/PinoLogger';

export interface MergeAnalysisResult {
	blockingSetsMinSize: number;
	blockingSetsFilteredMinSize: number;
	splittingSetsMinSize: number;
	topTierSize: number;
}

export interface AnalysisResult {
	hasQuorumIntersection: boolean;
	hasSymmetricTopTier: boolean;
	node: MergeAnalysisResult;
	organization: MergeAnalysisResult;
	isp: MergeAnalysisResult;
	country: MergeAnalysisResult;
}

@injectable()
export default class FbasAnalyzerService {
	constructor(
		private analysisFacade: FbasAnalyzerFacade,
		@inject('Logger') private logger: Logger
	) {}

	performAnalysis(network: Network): Result<AnalysisResult, Error> {
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

		const nodeAnalysisResult = this.executeMergeAnalysis(
			nodesToAnalyze,
			faultyNodes,
			organizations,
			null
		);
		if (nodeAnalysisResult.isErr()) {
			return err(nodeAnalysisResult.error);
		}

		const organizationAnalysisResult = this.executeMergeAnalysis(
			nodesToAnalyze,
			faultyNodes,
			organizations,
			MergeBy.ORGANIZATION
		);
		if (organizationAnalysisResult.isErr()) {
			return err(organizationAnalysisResult.error);
		}

		const countryAnalysisResult = this.executeMergeAnalysis(
			nodesToAnalyze,
			faultyNodes,
			organizations,
			MergeBy.COUNTRY
		);
		if (countryAnalysisResult.isErr()) {
			return err(countryAnalysisResult.error);
		}

		const ispAnalysisResult = this.executeMergeAnalysis(
			nodesToAnalyze,
			faultyNodes,
			organizations,
			MergeBy.ISP
		);
		if (ispAnalysisResult.isErr()) {
			return err(ispAnalysisResult.error);
		}

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
			hasSymmetricTopTier: symmetricTopTierAnalysis.symmetric_top_tier !== null,
			hasQuorumIntersection: minimalQuorums.quorum_intersection,
			node: nodeAnalysisResult.value,
			organization: organizationAnalysisResult.value,
			country: countryAnalysisResult.value,
			isp: ispAnalysisResult.value
		});
	}

	private executeMergeAnalysis(
		nodes: FbasAnalysisNode[],
		faultyNodes: string[],
		organizations: FbasAnalysisOrganization[],
		mergeBy: MergeBy | null
	): Result<MergeAnalysisResult, Error> {
		const topTierAnalysisResult = this.analysisFacade.analyzeTopTier(
			nodes,
			organizations,
			mergeBy
		);

		if (topTierAnalysisResult.isErr()) {
			return err(topTierAnalysisResult.error);
		}
		const topTierAnalysis = topTierAnalysisResult.value;
		this.logger.info('fbas analysis cache hit', {
			cacheHit: topTierAnalysis.cache_hit,
			mergeBy: mergeBy
		});

		const blockingSetsAnalysisResult = this.analysisFacade.analyzeBlockingSets(
			nodes,
			[],
			organizations,
			mergeBy
		);
		if (blockingSetsAnalysisResult.isErr()) {
			return err(blockingSetsAnalysisResult.error);
		}
		const blockingSetsAnalysis = blockingSetsAnalysisResult.value;

		const blockingSetsAnalysisFilteredResult =
			this.analysisFacade.analyzeBlockingSets(
				nodes,
				faultyNodes,
				organizations,
				mergeBy
			);
		if (blockingSetsAnalysisFilteredResult.isErr()) {
			return err(blockingSetsAnalysisFilteredResult.error);
		}

		const blockingSetsAnalysisFiltered =
			blockingSetsAnalysisFilteredResult.value;

		const splittingSetsAnalysisResult =
			this.analysisFacade.analyzeSplittingSets(nodes, organizations, mergeBy);
		if (splittingSetsAnalysisResult.isErr()) {
			return err(splittingSetsAnalysisResult.error);
		}
		const splittingSetsAnalysis = splittingSetsAnalysisResult.value;

		return ok({
			topTierSize: topTierAnalysis.top_tier_size,
			blockingSetsMinSize: blockingSetsAnalysis.min,
			blockingSetsFilteredMinSize: blockingSetsAnalysisFiltered.min,
			splittingSetsMinSize: splittingSetsAnalysis.min
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
