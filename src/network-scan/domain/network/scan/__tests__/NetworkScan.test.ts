import NetworkScan from '../NetworkScan';
import { NodeScan } from '../../../node/scan/NodeScan';
import { mock } from 'jest-mock-extended';
import { OrganizationScan } from '../../../organization/scan/OrganizationScan';
import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';
import { AnalysisResult } from '../../FbasAnalyzerService';
import NetworkMeasurement from '../../NetworkMeasurement';
import { NetworkTransitiveQuorumSetFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/network-transitive-quorum-set-finder';
import { StronglyConnectedComponentsFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/strongly-connected-components-finder';

describe('NetworkScan', () => {
	it('should update latest ledger info from node scan', () => {
		const time = new Date();
		const networkScan = new NetworkScan(time);
		const nodeScan = new NodeScan(time, []);
		nodeScan.latestLedger = BigInt(123);
		nodeScan.latestLedgerCloseTime = new Date('2020-01-01T00:00:00.000Z');
		nodeScan.processedLedgers = [123];
		networkScan.processNodeScan(nodeScan);
		expect(networkScan.latestLedger).toEqual(nodeScan.latestLedger);
		expect(networkScan.latestLedgerCloseTime).toEqual(
			nodeScan.latestLedgerCloseTime
		);
		expect(networkScan.ledgers).toEqual(nodeScan.processedLedgers);
	});

	it('should add measurement', () => {
		const time = new Date();
		const networkScan = new NetworkScan(time);
		const nodeScan = mock<NodeScan>();
		nodeScan.getActiveFullValidatorsCount.mockReturnValue(1);
		nodeScan.getActiveValidatorsCount.mockReturnValue(2);
		nodeScan.getActiveWatchersCount.mockReturnValue(3);
		const organizationScan = mock<OrganizationScan>();
		organizationScan.getAvailableOrganizationsCount.mockReturnValue(4);
		const trustGraph = new TrustGraph(
			new StronglyConnectedComponentsFinder(),
			new NetworkTransitiveQuorumSetFinder()
		);
		const analysisResult: AnalysisResult = {
			cacheHit: true,
			countryMinimalBlockingSets: [['a']],
			countryMinimalBlockingSetsFaultyNodesFiltered: [['b']],
			countryMinimalBlockingSetsFaultyNodesFilteredMinSize: 1,
			countryMinimalBlockingSetsMinSize: 2,
			countryMinimalSplittingSets: [['c']],
			countryMinimalSplittingSetsMinSize: 3,
			hasQuorumIntersection: true,
			hasSymmetricTopTier: true,
			ispMinimalBlockingSets: [['d']],
			ispMinimalBlockingSetsFaultyNodesFiltered: [['e']],
			ispMinimalBlockingSetsFaultyNodesFilteredMinSize: 4,
			ispMinimalBlockingSetsMinSize: 5,
			ispMinimalSplittingSets: [['f']],
			ispMinimalSplittingSetsMinSize: 6,
			minimalBlockingSets: [['g']],
			minimalBlockingSetsFaultyNodesFiltered: [['h']],
			minimalBlockingSetsFaultyNodesFilteredMinSize: 7,
			minimalBlockingSetsMinSize: 8,
			minimalSplittingSets: [['i']],
			minimalSplittingSetsMinSize: 9,
			orgMinimalBlockingSets: [['j']],
			orgMinimalBlockingSetsFaultyNodesFiltered: [['k']],
			orgMinimalBlockingSetsFaultyNodesFilteredMinSize: 10,
			orgMinimalBlockingSetsMinSize: 11,
			orgMinimalSplittingSets: [['l']],
			orgMinimalSplittingSetsMinSize: 12,
			orgTopTier: ['m'],
			topTier: ['n'],
			orgTopTierSize: 13,
			topTierSize: 14
		};

		networkScan.addMeasurement(
			analysisResult,
			nodeScan,
			organizationScan,
			trustGraph
		);

		expect(networkScan.measurement).toBeInstanceOf(NetworkMeasurement);
		if (!(networkScan.measurement instanceof NetworkMeasurement)) return;
		expect(networkScan.measurement.time).toEqual(time);
		expect(networkScan.measurement.hasQuorumIntersection).toEqual(
			analysisResult.hasQuorumIntersection
		);
		expect(networkScan.measurement.hasSymmetricTopTier).toEqual(
			analysisResult.hasSymmetricTopTier
		);
		expect(networkScan.measurement.topTierSize).toEqual(
			analysisResult.topTierSize
		);
		expect(networkScan.measurement.minBlockingSetCountryFilteredSize).toEqual(
			analysisResult.countryMinimalBlockingSetsFaultyNodesFilteredMinSize
		);
		expect(networkScan.measurement.minBlockingSetCountrySize).toEqual(
			analysisResult.countryMinimalBlockingSetsMinSize
		);
		expect(networkScan.measurement.minSplittingSetCountrySize).toEqual(
			analysisResult.countryMinimalSplittingSetsMinSize
		);
		expect(networkScan.measurement.minBlockingSetSize).toEqual(
			analysisResult.minimalBlockingSetsMinSize
		);
		expect(networkScan.measurement.minBlockingSetFilteredSize).toEqual(
			analysisResult.minimalBlockingSetsFaultyNodesFilteredMinSize
		);
		expect(networkScan.measurement.minSplittingSetSize).toEqual(
			analysisResult.minimalSplittingSetsMinSize
		);
		expect(networkScan.measurement.minBlockingSetISPFilteredSize).toEqual(
			analysisResult.ispMinimalBlockingSetsFaultyNodesFilteredMinSize
		);
		expect(networkScan.measurement.minBlockingSetISPSize).toEqual(
			analysisResult.ispMinimalBlockingSetsMinSize
		);
		expect(networkScan.measurement.minSplittingSetISPSize).toEqual(
			analysisResult.ispMinimalSplittingSetsMinSize
		);
		expect(networkScan.measurement.minBlockingSetOrgsFilteredSize).toEqual(
			analysisResult.orgMinimalBlockingSetsFaultyNodesFilteredMinSize
		);
		expect(networkScan.measurement.minBlockingSetOrgsSize).toEqual(
			analysisResult.orgMinimalBlockingSetsMinSize
		);
		expect(networkScan.measurement.minSplittingSetOrgsSize).toEqual(
			analysisResult.orgMinimalSplittingSetsMinSize
		);
		expect(networkScan.measurement.topTierOrgsSize).toEqual(
			analysisResult.orgTopTierSize
		);
		expect(networkScan.measurement.hasTransitiveQuorumSet).toEqual(false);
		expect(networkScan.measurement.transitiveQuorumSetSize).toEqual(0);
		expect(networkScan.measurement.nrOfActiveWatchers).toEqual(
			nodeScan.getActiveWatchersCount()
		);
		expect(networkScan.measurement.nrOfActiveValidators).toEqual(
			nodeScan.getActiveValidatorsCount()
		);
		expect(networkScan.measurement.nrOfActiveFullValidators).toEqual(
			nodeScan.getActiveFullValidatorsCount()
		);
		expect(networkScan.measurement.nrOfActiveOrganizations).toEqual(
			organizationScan.getAvailableOrganizationsCount()
		);
	});
});
