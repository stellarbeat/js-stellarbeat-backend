import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import 'reflect-metadata';
import FbasAnalyzerFacade, {
	FbasAnalysisNode,
	FbasAnalysisOrganization,
	MergeBy
} from './FbasAnalyzerFacade';
import { Logger } from '../../../../../core/services/PinoLogger';
import Organization from '../../../organization/Organization';
import Node from '../../../node/Node';
import { FbasMapper } from './FbasMapper';
import { AnalysisResult } from './AnalysisResult';
import { FbasMergedByAnalyzer } from './FbasMergedByAnalyzer';

@injectable()
export default class FbasAnalyzerService {
	constructor(
		private analysisFacade: FbasAnalyzerFacade,
		private fbasMergedByAnalyzer: FbasMergedByAnalyzer,
		@inject('Logger') private logger: Logger
	) {}

	performAnalysis(
		nodes: Node[],
		organizations: Organization[]
	): Result<AnalysisResult, Error> {
		const faultyNodes = this.mapToFaultyNodes(nodes);
		const fbasNodes = this.mapToFbasNodes(nodes);
		const fbasOrganizations = this.mapToFbasOrganizations(organizations);

		const combined = Result.combine([
			this.analyseQuorumIntersectionAndSymmetry(fbasNodes, fbasOrganizations),
			this.fbasMergedByAnalyzer.execute(
				fbasNodes,
				faultyNodes,
				fbasOrganizations,
				null
			),
			this.fbasMergedByAnalyzer.execute(
				fbasNodes,
				faultyNodes,
				fbasOrganizations,
				MergeBy.ORGANIZATION
			),
			this.fbasMergedByAnalyzer.execute(
				fbasNodes,
				faultyNodes,
				fbasOrganizations,
				MergeBy.COUNTRY
			),
			this.fbasMergedByAnalyzer.execute(
				fbasNodes,
				faultyNodes,
				fbasOrganizations,
				MergeBy.ISP
			)
		]);

		if (combined.isErr()) return err(combined.error);

		return ok({
			hasSymmetricTopTier: combined.value[0].hasSymmetricTopTier,
			hasQuorumIntersection: combined.value[0].hasQuorumIntersection,
			node: combined.value[1],
			organization: combined.value[2],
			country: combined.value[3],
			isp: combined.value[4]
		});
	}

	private analyseQuorumIntersectionAndSymmetry(
		fbasNodes: FbasAnalysisNode[],
		fbasOrganizations: FbasAnalysisOrganization[]
	): Result<
		{
			hasQuorumIntersection: boolean;
			hasSymmetricTopTier: boolean;
		},
		Error
	> {
		const result = Result.combine([
			this.analysisFacade.analyzeSymmetricTopTier(
				fbasNodes,
				fbasOrganizations,
				null
			),
			this.analysisFacade.analyzeMinimalQuorums(
				fbasNodes,
				fbasOrganizations,
				null
			)
		]);

		if (result.isErr()) return err(result.error);

		return ok({
			hasQuorumIntersection: result.value[1].quorum_intersection,
			hasSymmetricTopTier: result.value[0].symmetric_top_tier !== null
		});
	}

	private mapToFbasOrganizations(
		organizations: Organization[]
	): FbasAnalysisOrganization[] {
		return organizations.map(FbasMapper.mapToFbasAnalysisOrganization);
	}

	private mapToFbasNodes(nodes: Node[]): FbasAnalysisNode[] {
		return nodes.map(FbasMapper.mapToFbasAnalysisNode);
	}

	private mapToFaultyNodes(nodes: Node[]) {
		return nodes
			.filter((node) => !node.isValidating())
			.map((node) => node.publicKey.value);
	}
}
