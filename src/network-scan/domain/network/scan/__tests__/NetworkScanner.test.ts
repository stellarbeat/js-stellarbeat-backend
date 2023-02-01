import { NetworkScanner } from '../NetworkScanner';
import { mock } from 'jest-mock-extended';
import { Logger } from '../../../../../core/services/PinoLogger';
import { NodeScan } from '../../../node/scan/NodeScan';
import FbasAnalyzerService, { AnalysisResult } from '../../FbasAnalyzerService';
import NetworkScan from '../NetworkScan';
import { OrganizationScan } from '../../../organization/scan/OrganizationScan';
import { err, ok } from 'neverthrow';
import { OrganizationMapper } from '../../../../mappers/OrganizationMapper';
import { NodeMapper } from '../../../../mappers/NodeMapper';

describe('NetworkScanner', () => {
	it('should perform a network scan', async function () {
		const networkScan = mock<NetworkScan>();
		const analyzer = mock<FbasAnalyzerService>();
		analyzer.performAnalysis.mockResolvedValue(ok(mock<AnalysisResult>()));
		const networkScanner = new NetworkScanner(
			analyzer,
			new NodeMapper(),
			new OrganizationMapper(),
			mock<Logger>()
		);

		const nodeScan = new NodeScan(new Date(), []);
		const organizationScan = new OrganizationScan(new Date(), []);
		const result = await networkScanner.execute(
			networkScan,
			nodeScan,
			organizationScan
		);
		expect(result.isOk()).toBeTruthy();

		expect(analyzer.performAnalysis).toBeCalled();
		expect(networkScan.addMeasurement).toBeCalled();
		expect(networkScan.completed).toBeTruthy();
	});

	it('should return an error if the analysis fails', async function () {
		const networkScan = mock<NetworkScan>();
		const analyzer = mock<FbasAnalyzerService>();
		analyzer.performAnalysis.mockResolvedValue(err(new Error('test')));
		const networkScanner = new NetworkScanner(
			analyzer,
			new NodeMapper(),
			new OrganizationMapper(),
			mock<Logger>()
		);

		const nodeScan = new NodeScan(new Date(), []);
		const organizationScan = new OrganizationScan(new Date(), []);
		const result = await networkScanner.execute(
			networkScan,
			nodeScan,
			organizationScan
		);
		expect(result.isOk()).toBeFalsy();

		expect(analyzer.performAnalysis).toBeCalled();
	});
});
