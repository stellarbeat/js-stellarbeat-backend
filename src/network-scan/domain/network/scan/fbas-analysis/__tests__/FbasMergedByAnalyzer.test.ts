import FbasAnalyzerFacade, {
	FbasAnalysisNode,
	FbasAnalysisOrganization,
	MergeBy
} from '../FbasAnalyzerFacade';
import { FbasMergedByAnalyzer } from '../FbasMergedByAnalyzer';
import { mock } from 'jest-mock-extended';
import { Logger } from '../../../../../../core/services/PinoLogger';
import { ok } from 'neverthrow';

describe('FbasMergedByAnalyzer', () => {
	test('execute', () => {
		const fbasAnalysisNode: FbasAnalysisNode = {
			publicKey: 'A',
			geoData: null,
			isp: null,
			quorumSet: null,
			name: null
		};
		const fbasAnalysisOrganization: FbasAnalysisOrganization = {
			id: 'AA',
			name: 'A',
			validators: ['A']
		};
		const faultyNodes = ['B'];

		const analyzerFacade = mock<FbasAnalyzerFacade>();
		analyzerFacade.analyzeBlockingSets.mockReturnValueOnce(
			ok({
				min: 2,
				size: 3,
				result: [['A', 'B', 'C']]
			})
		);

		//filtered
		analyzerFacade.analyzeBlockingSets.mockReturnValueOnce(
			ok({
				min: 3,
				size: 3,
				result: [['A', 'B', 'C']]
			})
		);
		analyzerFacade.analyzeSplittingSets.mockReturnValue(
			ok({
				min: 4,
				size: 5,
				result: [['A', 'B', 'C']]
			})
		);
		analyzerFacade.analyzeTopTier.mockReturnValue(
			ok({
				top_tier: ['A', 'B', 'C'],
				cache_hit: false,
				top_tier_size: 6
			})
		);
		const analyzer = new FbasMergedByAnalyzer(analyzerFacade, mock<Logger>());
		const result = analyzer.execute(
			[fbasAnalysisNode],
			faultyNodes,
			[fbasAnalysisOrganization],
			MergeBy.ORGANIZATION
		);

		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value).toEqual({
				blockingSetsFilteredMinSize: 3,
				blockingSetsMinSize: 2,
				splittingSetsMinSize: 4,
				topTierSize: 6
			});
		}

		expect(analyzerFacade.analyzeBlockingSets).toBeCalledTimes(2);
		expect(analyzerFacade.analyzeBlockingSets).toBeCalledWith(
			[fbasAnalysisNode],
			faultyNodes,
			[fbasAnalysisOrganization],
			MergeBy.ORGANIZATION
		);
		expect(analyzerFacade.analyzeBlockingSets).toBeCalledWith(
			[fbasAnalysisNode],
			[],
			[fbasAnalysisOrganization],
			MergeBy.ORGANIZATION
		);
		expect(analyzerFacade.analyzeSplittingSets).toBeCalledTimes(1);
		expect(analyzerFacade.analyzeSplittingSets).toBeCalledWith(
			[fbasAnalysisNode],
			[fbasAnalysisOrganization],
			MergeBy.ORGANIZATION
		);
		expect(analyzerFacade.analyzeTopTier).toBeCalledTimes(1);
		expect(analyzerFacade.analyzeTopTier).toBeCalledWith(
			[fbasAnalysisNode],
			[fbasAnalysisOrganization],
			MergeBy.ORGANIZATION
		);
	});
});
