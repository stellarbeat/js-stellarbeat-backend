import FbasAnalyzerFacade, {
	FbasAnalysisNode,
	FbasAnalysisOrganization,
	MergeBy
} from './FbasAnalyzerFacade';
import { err, ok, Result } from 'neverthrow';
import { AnalysisMergedResult } from './AnalysisMergedResult';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../../core/services/PinoLogger';

//Perform all analysis on the FBAS merged by country, organization or...
@injectable()
export class FbasMergedByAnalyzer {
	constructor(
		private analysisFacade: FbasAnalyzerFacade,
		@inject('Logger') private logger: Logger
	) {}

	public execute(
		nodes: FbasAnalysisNode[],
		faultyNodes: string[],
		organizations: FbasAnalysisOrganization[],
		mergeBy: MergeBy | null
	): Result<AnalysisMergedResult, Error> {
		const combined = Result.combine([
			this.analysisFacade.analyzeTopTier(nodes, organizations, mergeBy),
			this.analysisFacade.analyzeBlockingSets(
				nodes,
				[],
				organizations,
				mergeBy
			),
			this.analysisFacade.analyzeBlockingSets(
				nodes,
				faultyNodes,
				organizations,
				mergeBy
			),
			this.analysisFacade.analyzeSplittingSets(nodes, organizations, mergeBy)
		]);
		if (combined.isErr()) return err(combined.error);

		this.logCacheMiss(combined.value[0].cache_hit);

		return ok({
			topTierSize: combined.value[0].top_tier_size,
			blockingSetsMinSize: combined.value[1].min,
			blockingSetsFilteredMinSize: combined.value[2].min,
			splittingSetsMinSize: combined.value[3].min
		});
	}

	private logCacheMiss(cacheHit: boolean) {
		if (!cacheHit) {
			this.logger.info('fbas analysis cache not hit');
		}
	}
}
