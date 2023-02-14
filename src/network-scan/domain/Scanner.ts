import { NodeScanner } from './node/scan/NodeScanner';
import { OrganizationScanner } from './organization/scan/OrganizationScanner';
import { inject, injectable } from 'inversify';
import { Logger } from '../../core/services/PinoLogger';
import { Network } from './network/Network';
import { NodeMeasurementAverage } from './node/NodeMeasurementAverage';
import { err, ok, Result } from 'neverthrow';
import NetworkScan from './network/scan/NetworkScan';
import { NodeScan } from './node/scan/NodeScan';
import { OrganizationScan } from './organization/scan/OrganizationScan';
import { NetworkScanner } from './network/scan/NetworkScanner';
import { NodeAddress } from './node/NodeAddress';

export interface ScanResult {
	networkScan: NetworkScan;
	nodeScan: NodeScan;
	organizationScan: OrganizationScan;
}

@injectable()
export class Scanner {
	constructor(
		private nodeScanner: NodeScanner,
		private organizationScanner: OrganizationScanner,
		private networkScanner: NetworkScanner,
		@inject('Logger')
		private logger: Logger
	) {}

	async scan(
		time: Date,
		network: Network,
		previousScanResult: ScanResult | null,
		measurement30DayAverages: NodeMeasurementAverage[],
		bootstrapNodeAddresses: NodeAddress[]
	): Promise<Result<ScanResult, Error>> {
		if (!previousScanResult && bootstrapNodeAddresses.length === 0) {
			return err(
				new Error(
					'Cannot scan without known peer nodes or previous scan result'
				)
			);
		}

		const nodeScan = new NodeScan(
			time,
			previousScanResult?.nodeScan.nodes ?? []
		);
		const nodeScanResult = await this.nodeScanner.execute(
			nodeScan,
			network.quorumSetConfiguration,
			network.stellarCoreVersion,
			measurement30DayAverages,
			previousScanResult?.networkScan.latestLedger ?? null,
			previousScanResult?.networkScan.latestLedgerCloseTime ?? null,
			bootstrapNodeAddresses
		);
		if (nodeScanResult.isErr()) {
			return err(nodeScanResult.error);
		}

		const organizationScan = new OrganizationScan(
			time,
			previousScanResult?.organizationScan.organizations ?? []
		);
		const organizationScanResult = await this.organizationScanner.execute(
			organizationScan,
			nodeScan
		);
		if (organizationScanResult.isErr()) {
			return err(organizationScanResult.error);
		}

		const networkScan = new NetworkScan(time);
		const networkScanResult = await this.networkScanner.execute(
			networkScan,
			nodeScan,
			organizationScan,
			network.quorumSetConfiguration
		);
		if (networkScanResult.isErr()) {
			return err(networkScanResult.error);
		}

		return ok({
			networkScan,
			nodeScan,
			organizationScan
		});
	}
}
