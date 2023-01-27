import { err, ok, Result } from 'neverthrow';
import NetworkScan from './NetworkScan';
import { Network as NetworkDTO } from '@stellarbeat/js-stellarbeat-shared';
import { inject, injectable } from 'inversify';
import { Network } from '../Network';
import { NodeScanner } from '../../node/scan/NodeScanner';
import { OrganizationScanner } from '../../organization/scan/OrganizationScanner';
import { Logger } from '../../../../core/services/PinoLogger';
import Node from '../../node/Node';
import { NodeScan } from '../../node/scan/NodeScan';
import { NodeMeasurementAverage } from '../../node/NodeMeasurementAverage';
import { NodeMapper } from '../../../services/NodeMapper';
import { OrganizationScan } from '../../organization/scan/OrganizationScan';
import { OrganizationMapper } from '../../../services/OrganizationMapper';
import Organization from '../../organization/Organization';

export type NetworkScanResult = {
	network: NetworkDTO;
	networkScan: NetworkScan;
};

@injectable()
export class NetworkScanner {
	constructor(
		private nodeScanner: NodeScanner,
		private organizationScanner: OrganizationScanner,
		@inject('Logger')
		private logger: Logger
	) {}

	async scan(
		latestClosedLedger: string | null,
		latestLedgerCloseTime: Date | null,
		network: Network,
		nodes: Node[],
		organizations: Organization[],
		measurement30DayAverages: NodeMeasurementAverage[]
	): Promise<Result<NetworkScanResult, Error>> {
		const scanTime = new Date();
		const nodeScan = new NodeScan(scanTime, nodes);
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

		const organizationScan = new OrganizationScan(scanTime, organizations);
		await this.organizationScanner.execute(organizationScan, nodeScan);

		const networkScan = new NetworkScan(
			new Date(),
			nodeScanResult.value.processedLedgers
		);
		networkScan.latestLedger = nodeScanResult.value.latestLedger;
		networkScan.latestLedgerCloseTime =
			nodeScanResult.value.latestLedgerCloseTime ?? scanTime;

		const nodeDTOs = nodeScanResult.value.nodes.map((node) =>
			NodeMapper.toNodeDTO(scanTime, node)
		);

		const organizationDTOs = organizationScan.organizations.map(
			(organization) => OrganizationMapper.toOrganizationDTO(organization)
		);

		const newNetwork: NetworkDTO = new NetworkDTO(
			nodeDTOs,
			organizationDTOs,
			networkScan.time,
			networkScan.latestLedger.toString()
		);

		return ok({
			network: newNetwork,
			networkScan: networkScan
		});
	}
}
