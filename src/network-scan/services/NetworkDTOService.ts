import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { Network as NetworkDTO } from '@stellarbeat/js-stellarbeat-shared/lib/network';
import { ScanRepository } from '../domain/ScanRepository';
import { ScanResult } from '../domain/Scanner';
import { NetworkMeasurementMapper } from '../mappers/NetworkMeasurementMapper';
import { OrganizationDTOService } from './OrganizationDTOService';
import { NodeDTOService } from './NodeDTOService';
import { NETWORK_TYPES } from '../infrastructure/di/di-types';

@injectable()
export class NetworkDTOService {
	constructor(
		private scanRepository: ScanRepository,
		private nodeDTOService: NodeDTOService,
		private organizationDTOService: OrganizationDTOService,
		@inject(NETWORK_TYPES.networkName) protected networkName: string,
		@inject(NETWORK_TYPES.networkId) protected networkId: string
	) {}

	async getLatestNetworkDTO(): Promise<Result<NetworkDTO | null, Error>> {
		const scanResultOrError = await this.scanRepository.findLatest();

		if (scanResultOrError.isErr()) return err(scanResultOrError.error);
		if (scanResultOrError.value === null) return ok(null);

		return this.mapScanResultToNetworkDTO(scanResultOrError.value);
	}

	async getNetworkDTOAt(time: Date): Promise<Result<NetworkDTO | null, Error>> {
		const scanResultOrError = await this.scanRepository.findAt(time);

		if (scanResultOrError.isErr()) return err(scanResultOrError.error);
		if (scanResultOrError.value === null) return ok(null);

		return this.mapScanResultToNetworkDTO(scanResultOrError.value);
	}

	async getPreviousNetworkDTO(
		currentNetworkTime: Date
	): Promise<Result<NetworkDTO | null, Error>> {
		const scanResultOrError = await this.scanRepository.findPrevious(
			currentNetworkTime
		);
		if (scanResultOrError.isErr()) return err(scanResultOrError.error);
		if (scanResultOrError.value === null) return ok(null);

		return this.mapScanResultToNetworkDTO(scanResultOrError.value);
	}

	public async mapScanResultToNetworkDTO(
		scan: ScanResult
	): Promise<Result<NetworkDTO, Error>> {
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
		const networkStatistics = NetworkMeasurementMapper.mapToNetworkStatistics(
			scan.networkScan.measurement
		);

		const networkDTO = new NetworkDTO(
			nodeDTOsOrError.value,
			organizationDTOsOrError.value,
			scan.networkScan.time,
			scan.networkScan.latestLedger.toString(),
			networkStatistics
		);

		networkDTO.id = this.networkId;
		networkDTO.name = this.networkName;

		return ok(networkDTO);
	}
}
