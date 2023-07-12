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
import { NetworkRepository } from '../domain/network/NetworkRepository';
import { NetworkId } from '../domain/network/NetworkId';
import { mapUnknownToError } from '../../core/utilities/mapUnknownToError';

@injectable()
export class NetworkDTOService {
	constructor(
		private scanRepository: ScanRepository,
		private nodeDTOService: NodeDTOService,
		private organizationDTOService: OrganizationDTOService,
		@inject(NETWORK_TYPES.NetworkRepository)
		private networkRepository: NetworkRepository,
		@inject(NETWORK_TYPES.networkId) protected networkId: string,
		@inject(NETWORK_TYPES.networkName) protected networkName: string
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
		const networkId = new NetworkId(this.networkId);
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

		try {
			const network = await this.networkRepository.findAtDateByNetworkId(
				networkId,
				scan.networkScan.time
			);

			//Because of backwards compatibility we need to support networks that have no snapshots (this feature was added later).
			//If a network has no snapshots, we fetch the passphrase (the only required property next to networkId) and return undefined for all other fields.
			let passphrase: string | undefined;
			if (!network) {
				passphrase = await this.networkRepository.findPassphraseByNetworkId(
					networkId
				);
			} else {
				passphrase = network.passphrase;
			}

			if (passphrase === undefined)
				return err(
					new Error('Scan for unknown networkId ' + networkId + ' found')
				);

			const networkV1DTO = NetworkV1DTOMapper.toNetworkV1DTO(
				this.networkName,
				networkId.value,
				nodeDTOsOrError.value,
				organizationDTOsOrError.value,
				scan.networkScan.measurement,
				nodesTrustGraph.networkTransitiveQuorumSet,
				nodesTrustGraph.stronglyConnectedComponents,
				Number(scan.networkScan.latestLedger),
				passphrase,
				network
			);

			return ok(networkV1DTO);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}
}
