import { err, ok, Result } from 'neverthrow';
import NetworkScan from './NetworkScan';
import { Network as NetworkDTO } from '@stellarbeat/js-stellarbeat-shared';
import { inject, injectable } from 'inversify';
import { Network } from '../Network';
import { NodeScanner } from '../../node/scan/NodeScanner';
import { OrganizationScanner } from '../../organization/scan/OrganizationScanner';
import { Logger } from '../../../../core/services/PinoLogger';

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
		networkDTO: NetworkDTO,
		network: Network
	): Promise<Result<NetworkScanResult, Error>> {
		const scanTime = new Date();
		const nodeScanResult = await this.nodeScanner.scan(
			scanTime,
			networkDTO.latestLedger,
			networkDTO.time,
			network.quorumSetConfiguration,
			networkDTO.nodes,
			network.stellarCoreVersion
		);
		if (nodeScanResult.isErr()) {
			return err(nodeScanResult.error);
		}
		const networkScan = new NetworkScan(
			new Date(),
			nodeScanResult.value.processedLedgers
		);
		networkScan.latestLedger = nodeScanResult.value.latestLedger;
		networkScan.latestLedgerCloseTime =
			nodeScanResult.value.latestLedgerCloseTime;

		const newNetwork: NetworkDTO = new NetworkDTO(
			nodeScanResult.value.nodeDTOs,
			networkDTO.organizations,
			networkScan.time,
			networkScan.latestLedger.toString()
		);

		return ok({
			network: newNetwork,
			networkScan: networkScan
		});
	}
}
