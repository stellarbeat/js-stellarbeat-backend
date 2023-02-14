import NetworkScan from '../NetworkScan';
import { NodeScan } from '../../../node/scan/NodeScan';
import { mock } from 'jest-mock-extended';
import { OrganizationScan } from '../../../organization/scan/OrganizationScan';
import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';
import NetworkMeasurement from '../../NetworkMeasurement';
import { NetworkTransitiveQuorumSetFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/network-transitive-quorum-set-finder';
import { StronglyConnectedComponentsFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/strongly-connected-components-finder';
import { AnalysisResult } from '../fbas-analysis/AnalysisResult';

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
			country: {
				blockingSetsMinSize: 1,
				topTierSize: 2,
				blockingSetsFilteredMinSize: 3,
				splittingSetsMinSize: 4
			},
			hasQuorumIntersection: true,
			hasSymmetricTopTier: true,
			isp: {
				blockingSetsMinSize: 5,
				topTierSize: 6,
				blockingSetsFilteredMinSize: 7,
				splittingSetsMinSize: 8
			},
			node: {
				topTierSize: 9,
				splittingSetsMinSize: 10,
				blockingSetsMinSize: 11,
				blockingSetsFilteredMinSize: 12
			},
			organization: {
				splittingSetsMinSize: 13,
				blockingSetsMinSize: 14,
				blockingSetsFilteredMinSize: 15,
				topTierSize: 16
			}
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
			analysisResult.node.topTierSize
		);
		expect(networkScan.measurement.minBlockingSetCountryFilteredSize).toEqual(
			analysisResult.country.blockingSetsFilteredMinSize
		);
		expect(networkScan.measurement.minBlockingSetCountrySize).toEqual(
			analysisResult.country.blockingSetsMinSize
		);
		expect(networkScan.measurement.minSplittingSetCountrySize).toEqual(
			analysisResult.country.splittingSetsMinSize
		);
		expect(networkScan.measurement.minBlockingSetSize).toEqual(
			analysisResult.node.blockingSetsMinSize
		);
		expect(networkScan.measurement.minBlockingSetFilteredSize).toEqual(
			analysisResult.node.blockingSetsFilteredMinSize
		);
		expect(networkScan.measurement.minSplittingSetSize).toEqual(
			analysisResult.node.splittingSetsMinSize
		);
		expect(networkScan.measurement.minBlockingSetISPFilteredSize).toEqual(
			analysisResult.isp.blockingSetsFilteredMinSize
		);
		expect(networkScan.measurement.minBlockingSetISPSize).toEqual(
			analysisResult.isp.blockingSetsMinSize
		);
		expect(networkScan.measurement.minSplittingSetISPSize).toEqual(
			analysisResult.isp.splittingSetsMinSize
		);
		expect(networkScan.measurement.minBlockingSetOrgsFilteredSize).toEqual(
			analysisResult.organization.blockingSetsFilteredMinSize
		);
		expect(networkScan.measurement.minBlockingSetOrgsSize).toEqual(
			analysisResult.organization.blockingSetsMinSize
		);
		expect(networkScan.measurement.minSplittingSetOrgsSize).toEqual(
			analysisResult.organization.splittingSetsMinSize
		);
		expect(networkScan.measurement.topTierOrgsSize).toEqual(
			analysisResult.organization.topTierSize
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
