import { NodeScanner } from './node/scan/NodeScanner';
import { OrganizationScanner } from './organization/scan/OrganizationScanner';
import { inject, injectable } from 'inversify';
import { Logger } from '../../core/services/PinoLogger';
import { Network } from './network/Network';
import Node from './node/Node';
import Organization from './organization/Organization';
import { NodeMeasurementAverage } from './node/NodeMeasurementAverage';
import { err, ok, Result } from 'neverthrow';
import NetworkScan from './network/scan/NetworkScan';
import { NodeScan } from './node/scan/NodeScan';
import { OrganizationScan } from './organization/scan/OrganizationScan';
import { NetworkScanner } from './network/scan/NetworkScanner';

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
		latestClosedLedger: BigInt | null,
		latestLedgerCloseTime: Date | null,
		network: Network,
		nodes: Node[],
		organizations: Organization[],
		measurement30DayAverages: NodeMeasurementAverage[]
	): Promise<Result<ScanResult, Error>> {
		const nodeScan = new NodeScan(time, nodes);
		const nodeScanResult = await this.nodeScanner.execute(
			nodeScan,
			network.quorumSetConfiguration,
			network.stellarCoreVersion,
			measurement30DayAverages,
			latestClosedLedger,
			latestLedgerCloseTime
		);
		if (nodeScanResult.isErr()) {
			return err(nodeScanResult.error);
		}

		const organizationScan = new OrganizationScan(time, organizations);
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
			organizationScan
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
