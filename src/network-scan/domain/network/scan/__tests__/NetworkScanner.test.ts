import { NetworkScanner } from '../NetworkScanner';
import { mock } from 'jest-mock-extended';
import { Logger } from '../../../../../core/services/PinoLogger';
import { NodeScan } from '../../../node/scan/NodeScan';
import FbasAnalyzerService from '../fbas-analysis/FbasAnalyzerService';
import NetworkScan from '../NetworkScan';
import { OrganizationScan } from '../../../organization/scan/OrganizationScan';
import { err, ok } from 'neverthrow';
import { AnalysisResult } from '../fbas-analysis/AnalysisResult';
import { NodesInTransitiveNetworkQuorumSetFinder } from '../NodesInTransitiveNetworkQuorumSetFinder';
import { createDummyNetworkQuorumSetConfiguration } from '../../__fixtures__/createDummyNetworkQuorumSetConfiguration';

describe('NetworkScanner', () => {
	it('should perform a network scan', async function () {
		const {
			networkScan,
			analyzer,
			nodesInTransitiveNetworkQuorumSetFinder,
			networkScanner
		} = setupSUT();

		nodesInTransitiveNetworkQuorumSetFinder.find.mockReturnValue([]);
		analyzer.performAnalysis.mockReturnValue(ok(mock<AnalysisResult>()));

		const nodeScan = new NodeScan(new Date(), []);
		const organizationScan = new OrganizationScan(new Date(), []);

		const result = await networkScanner.execute(
			networkScan,
			nodeScan,
			organizationScan,
			createDummyNetworkQuorumSetConfiguration()
		);
		expect(result.isOk()).toBeTruthy();

		expect(analyzer.performAnalysis).toBeCalled();
		expect(nodesInTransitiveNetworkQuorumSetFinder.find).toBeCalledTimes(1);
		expect(networkScan.addMeasurement).toBeCalled();
		expect(networkScan.completed).toBeTruthy();
	});

	it('should return an error if the analysis fails', async function () {
		const {
			networkScan,
			analyzer,
			nodesInTransitiveNetworkQuorumSetFinder,
			networkScanner
		} = setupSUT();

		nodesInTransitiveNetworkQuorumSetFinder.find.mockReturnValue([]);
		analyzer.performAnalysis.mockReturnValue(err(new Error('test')));

		const nodeScan = new NodeScan(new Date(), []);
		const organizationScan = new OrganizationScan(new Date(), []);
		const result = await networkScanner.execute(
			networkScan,
			nodeScan,
			organizationScan,
			createDummyNetworkQuorumSetConfiguration()
		);
		expect(result.isOk()).toBeFalsy();

		expect(analyzer.performAnalysis).toBeCalled();
	});

	function setupSUT() {
		const networkScan = mock<NetworkScan>();
		const analyzer = mock<FbasAnalyzerService>();
		const nodesInTransitiveNetworkQuorumSetFinder =
			mock<NodesInTransitiveNetworkQuorumSetFinder>();

		const networkScanner = new NetworkScanner(
			analyzer,
			nodesInTransitiveNetworkQuorumSetFinder,
			mock<Logger>()
		);
		return {
			networkScan,
			analyzer,
			nodesInTransitiveNetworkQuorumSetFinder,
			networkScanner
		};
	}
});
