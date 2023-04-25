import { NodeScan } from './node/scan/NodeScan';
import { OrganizationScan } from './organization/scan/OrganizationScan';
import NetworkScan from './network/scan/NetworkScan';
import { inject, injectable } from 'inversify';
import { NETWORK_TYPES } from '../infrastructure/di/di-types';
import { NodeRepository } from './node/NodeRepository';
import { OrganizationRepository } from './organization/OrganizationRepository';
import { NetworkScanRepository } from './network/scan/NetworkScanRepository';
import { MeasurementsRollupService } from './measurement-aggregation/MeasurementsRollupService';
import NodeSnapShotArchiver from './node/snapshotting/NodeSnapShotArchiver';
import { NodeMapper } from '../mappers/NodeMapper';
import { OrganizationMapper } from '../mappers/OrganizationMapper';
import { Network as NetworkDTO } from '@stellarbeat/js-stellarbeat-shared';
import { ScanResult } from './Scanner';
import { Result, err, ok } from 'neverthrow';
import { mapUnknownToError } from '../../core/utilities/mapUnknownToError';
import { CustomError } from '../../core/errors/CustomError';

export class NodesPersistenceError extends CustomError {
	constructor(cause: Error) {
		super('Error persisting nodes', NodesPersistenceError.name, cause);
	}
}

export class NodesArchivalError extends CustomError {
	constructor(cause: Error) {
		super('Error archiving nodes', NodesArchivalError.name, cause);
	}
}

export class OrganizationsPersistenceError extends CustomError {
	constructor(cause: Error) {
		super(
			'Error persisting organizations',
			OrganizationsPersistenceError.name,
			cause
		);
	}
}

export class NetworkScanPersistenceError extends CustomError {
	constructor(cause: Error) {
		super(
			'Error persisting network scan',
			NetworkScanPersistenceError.name,
			cause
		);
	}
}

export class RollupMeasurementsError extends CustomError {
	constructor(cause: Error) {
		super('Error rolling up measurements', RollupMeasurementsError.name, cause);
	}
}

@injectable()
export class ScanRepository {
	constructor(
		@inject(NETWORK_TYPES.NodeRepository)
		private nodeRepository: NodeRepository,
		@inject(NETWORK_TYPES.OrganizationRepository)
		private organizationRepository: OrganizationRepository,
		@inject(NETWORK_TYPES.NetworkScanRepository)
		private networkScanRepository: NetworkScanRepository,
		@inject(NETWORK_TYPES.MeasurementsRollupService)
		protected measurementRollupService: MeasurementsRollupService,
		protected archiver: NodeSnapShotArchiver,
		private nodeMapper: NodeMapper,
		private organizationMapper: OrganizationMapper
	) {}

	async saveAndRollupMeasurements(
		nodeScan: NodeScan,
		organizationScan: OrganizationScan,
		networkScan: NetworkScan
	): Promise<Result<void, Error>> {
		try {
			await this.nodeRepository.save(nodeScan.nodes, networkScan.time);
		} catch (e) {
			return err(new NodesPersistenceError(mapUnknownToError(e)));
		}

		try {
			await this.organizationRepository.save(
				organizationScan.organizations,
				networkScan.time
			);
		} catch (e) {
			return err(new OrganizationsPersistenceError(mapUnknownToError(e)));
		}

		try {
			await this.networkScanRepository.saveOne(networkScan);
		} catch (e) {
			return err(new NetworkScanPersistenceError(mapUnknownToError(e)));
		}

		try {
			await this.measurementRollupService.rollupMeasurements(networkScan);
		} catch (e) {
			return err(new RollupMeasurementsError(mapUnknownToError(e)));
		}

		try {
			//archive nodes needs to happen after node measurement rollups because it takes day measurements into account.
			//todo: call individual rollups (e.g. node rollups after node persistence)
			await this.archiver.archiveNodes(
				networkScan,
				this.getNetworkDTO(nodeScan, organizationScan, networkScan)
			);
		} catch (e) {
			return err(new NodesArchivalError(mapUnknownToError(e)));
		}

		return ok(undefined);
	}

	async findLatest(): Promise<Result<ScanResult | null, Error>> {
		try {
			const networkScan = await this.networkScanRepository.findLatest();
			return await this.findScanResult(networkScan);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	async findPrevious(at: Date): Promise<Result<ScanResult | null, Error>> {
		try {
			const networkScan = await this.networkScanRepository.findPreviousAt(at);
			return await this.findScanResult(networkScan);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	async findAt(at: Date): Promise<Result<ScanResult | null, Error>> {
		try {
			const networkScan = await this.networkScanRepository.findAt(at);
			return await this.findScanResult(networkScan);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	private async findScanResult(
		networkScan: NetworkScan | undefined
	): Promise<Result<ScanResult | null, Error>> {
		if (!networkScan) return ok(null);

		const activeNodes = await this.nodeRepository.findActive(networkScan.time);
		const nodeScan = new NodeScan(networkScan.time, activeNodes);
		const organizations = await this.organizationRepository.findActive(
			networkScan.time
		);
		const organizationScan = new OrganizationScan(
			networkScan.time,
			organizations
		);
		return ok({
			nodeScan,
			organizationScan,
			networkScan
		});
	}

	//@deprecated until we refactor archiving
	private getNetworkDTO(
		nodeScan: NodeScan,
		organizationScan: OrganizationScan,
		networkScan: NetworkScan
	): NetworkDTO {
		const nodeDTOs = nodeScan.nodes.map((node) =>
			this.nodeMapper.toNodeDTO(nodeScan.time, node)
		);
		const organizationDTOs = organizationScan.organizations.map(
			(organization) => this.organizationMapper.toOrganizationDTO(organization)
		);

		return new NetworkDTO(nodeDTOs, organizationDTOs, networkScan.time);
	}
}
