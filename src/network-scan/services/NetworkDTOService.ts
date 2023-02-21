import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { ScanRepository } from '../domain/ScanRepository';
import { ScanResult } from '../domain/Scanner';
import { OrganizationDTOService } from './OrganizationDTOService';
import { NodeDTOService } from './NodeDTOService';
import { NETWORK_TYPES } from '../infrastructure/di/di-types';
import { NetworkV1 } from '@stellarbeat/js-stellarbeat-shared';
import { NetworkV1DTOMapper } from '../mappers/NetworkV1DTOMapper';
import { TrustGraphFactory } from '../domain/node/scan/TrustGraphFactory';

@injectable()
export class NetworkDTOService {
	constructor(
		private scanRepository: ScanRepository,
		private nodeDTOService: NodeDTOService,
		private organizationDTOService: OrganizationDTOService,
		@inject(NETWORK_TYPES.networkName) protected networkName: string,
		@inject(NETWORK_TYPES.networkId) protected networkId: string
	) {}

	async getLatestNetworkDTO(): Promise<Result<NetworkV1 | null, Error>> {
		const scanResultOrError = await this.scanRepository.findLatest();

		if (scanResultOrError.isErr()) return err(scanResultOrError.error);
		if (scanResultOrError.value === null) return ok(null);

		return this.mapScanResultToNetworkDTO(scanResultOrError.value);
	}

	async getNetworkDTOAt(time: Date): Promise<Result<NetworkV1 | null, Error>> {
		const scanResultOrError = await this.scanRepository.findAt(time);

		if (scanResultOrError.isErr()) return err(scanResultOrError.error);
		if (scanResultOrError.value === null) return ok(null);

		return this.mapScanResultToNetworkDTO(scanResultOrError.value);
	}

	async getPreviousNetworkDTO(
		currentNetworkTime: Date
	): Promise<Result<NetworkV1 | null, Error>> {
		const scanResultOrError = await this.scanRepository.findPrevious(
			currentNetworkTime
		);
		if (scanResultOrError.isErr()) return err(scanResultOrError.error);
		if (scanResultOrError.value === null) return ok(null);

		return this.mapScanResultToNetworkDTO(scanResultOrError.value);
	}

	public async mapScanResultToNetworkDTO(
		scan: ScanResult
	): Promise<Result<NetworkV1, Error>> {
		const organizationDTOsOrError =
			await this.organizationDTOService.getOrganizationDTOs(
				scan.organizationScan.time,
				scan.organizationScan.organizations
			);
		if (organizationDTOsOrError.isErr())
			return err(organizationDTOsOrError.error);

		const nodeDTOsOrError = await this.nodeDTOService.getNodeDTOs(
			scan.nodeScan.time,
			scan.nodeScan.nodes,
			scan.organizationScan.organizations
		);

		if (nodeDTOsOrError.isErr()) return err(nodeDTOsOrError.error);

		if (scan.networkScan.measurement === null)
			//todo: make measurement required in scan ?
			return err(new Error('network measurement missing'));

		const nodesTrustGraph = TrustGraphFactory.create(scan.nodeScan.nodes);

		const networkV1DTO = NetworkV1DTOMapper.toNetworkV1DTO(
			this.networkName,
			this.networkId,
			nodeDTOsOrError.value,
			organizationDTOsOrError.value,
			scan.networkScan.measurement,
			nodesTrustGraph.networkTransitiveQuorumSet,
			nodesTrustGraph.stronglyConnectedComponents,
			Number(scan.networkScan.latestLedger)
		);

		return ok(networkV1DTO);
	}
}
