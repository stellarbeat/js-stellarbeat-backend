import 'reflect-metadata';
import FbasAnalyzerService from '../FbasAnalyzerService';
import FbasAnalyzerFacade, { MergeBy } from '../FbasAnalyzerFacade';
import { LoggerMock } from '../../../../../../core/services/__mocks__/LoggerMock';
import { AnalysisResult } from '../AnalysisResult';
import { mock } from 'jest-mock-extended';
import { FbasMergedByAnalyzer } from '../FbasMergedByAnalyzer';
import { ok } from 'neverthrow';
import { createDummyNode } from '../../../../node/__fixtures__/createDummyNode';
import NodeMeasurement from '../../../../node/NodeMeasurement';
import Organization from '../../../../organization/Organization';
import { createDummyOrganizationId } from '../../../../organization/__fixtures__/createDummyOrganizationId';
import { FbasMapper } from '../FbasMapper';

describe('analyze fbas', () => {
	it('should analyze correctly', () => {
		const facade = mock<FbasAnalyzerFacade>();
		const fbasMergedByAnalyzer = mock<FbasMergedByAnalyzer>();

		const fbasAnalyzerService = new FbasAnalyzerService(
			facade,
			fbasMergedByAnalyzer,
			new LoggerMock()
		);

		facade.analyzeSymmetricTopTier.mockReturnValueOnce(
			ok({
				symmetric_top_tier: {
					threshold: 1,
					validators: ['A'],
					innerQuorumSets: null
				}
			})
		);

		facade.analyzeMinimalQuorums.mockReturnValueOnce(
			ok({
				quorum_intersection: true,
				result: [],
				size: 1,
				min: 1
			})
		);

		fbasMergedByAnalyzer.execute.mockReturnValueOnce(
			ok({
				blockingSetsMinSize: 1,
				blockingSetsFilteredMinSize: 2,
				splittingSetsMinSize: 3,
				topTierSize: 4
			})
		);

		fbasMergedByAnalyzer.execute.mockReturnValueOnce(
			ok({
				blockingSetsMinSize: 5,
				blockingSetsFilteredMinSize: 6,
				splittingSetsMinSize: 7,
				topTierSize: 8
			})
		);

		fbasMergedByAnalyzer.execute.mockReturnValueOnce(
			ok({
				blockingSetsMinSize: 9,
				blockingSetsFilteredMinSize: 10,
				splittingSetsMinSize: 11,
				topTierSize: 12
			})
		);

		fbasMergedByAnalyzer.execute.mockReturnValueOnce(
			ok({
				blockingSetsMinSize: 13,
				blockingSetsFilteredMinSize: 14,
				splittingSetsMinSize: 15,
				topTierSize: 16
			})
		);

		const node1 = createDummyNode();
		const node1Measurement = new NodeMeasurement(new Date(), node1);
		node1Measurement.isValidating = true;
		node1.addMeasurement(node1Measurement);
		const node2 = createDummyNode();

		const organization = Organization.create(
			createDummyOrganizationId(),
			'home',
			new Date()
		);

		const result = fbasAnalyzerService.performAnalysis(
			[node1, node2],
			[organization]
		);

		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			const analysisResult: AnalysisResult = result.value;
			expect(analysisResult.hasSymmetricTopTier).toBeTruthy();
			expect(analysisResult.hasQuorumIntersection).toBeTruthy();
			expect(analysisResult.node.blockingSetsMinSize).toBe(1);
			expect(analysisResult.node.blockingSetsFilteredMinSize).toBe(2);
			expect(analysisResult.node.splittingSetsMinSize).toBe(3);
			expect(analysisResult.node.topTierSize).toBe(4);
			expect(analysisResult.organization.blockingSetsMinSize).toBe(5);
			expect(analysisResult.organization.blockingSetsFilteredMinSize).toBe(6);
			expect(analysisResult.organization.splittingSetsMinSize).toBe(7);
			expect(analysisResult.organization.topTierSize).toBe(8);
			expect(analysisResult.country.blockingSetsMinSize).toBe(9);
			expect(analysisResult.country.blockingSetsFilteredMinSize).toBe(10);
			expect(analysisResult.country.splittingSetsMinSize).toBe(11);
			expect(analysisResult.country.topTierSize).toBe(12);
			expect(analysisResult.isp.blockingSetsMinSize).toBe(13);
			expect(analysisResult.isp.blockingSetsFilteredMinSize).toBe(14);
			expect(analysisResult.isp.splittingSetsMinSize).toBe(15);
			expect(analysisResult.isp.topTierSize).toBe(16);
		}

		expect(fbasMergedByAnalyzer.execute).toHaveBeenCalledTimes(4);
		expect(fbasMergedByAnalyzer.execute).toHaveBeenCalledWith(
			[
				FbasMapper.mapToFbasAnalysisNode(node1),
				FbasMapper.mapToFbasAnalysisNode(node2)
			],
			[node2.publicKey.value],
			[FbasMapper.mapToFbasAnalysisOrganization(organization)],
			null
		);
		expect(fbasMergedByAnalyzer.execute).toHaveBeenCalledWith(
			[
				FbasMapper.mapToFbasAnalysisNode(node1),
				FbasMapper.mapToFbasAnalysisNode(node2)
			],
			[node2.publicKey.value],
			[FbasMapper.mapToFbasAnalysisOrganization(organization)],
			MergeBy.ORGANIZATION
		);
		expect(fbasMergedByAnalyzer.execute).toHaveBeenCalledWith(
			[
				FbasMapper.mapToFbasAnalysisNode(node1),
				FbasMapper.mapToFbasAnalysisNode(node2)
			],
			[node2.publicKey.value],
			[FbasMapper.mapToFbasAnalysisOrganization(organization)],
			MergeBy.COUNTRY
		);
		expect(fbasMergedByAnalyzer.execute).toHaveBeenCalledWith(
			[
				FbasMapper.mapToFbasAnalysisNode(node1),
				FbasMapper.mapToFbasAnalysisNode(node2)
			],
			[node2.publicKey.value],
			[FbasMapper.mapToFbasAnalysisOrganization(organization)],
			MergeBy.ISP
		);
	});
});
