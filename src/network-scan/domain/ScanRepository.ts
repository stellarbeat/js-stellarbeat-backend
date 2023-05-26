import { NodeScan } from './node/scan/NodeScan';
import { OrganizationScan } from './organization/scan/OrganizationScan';
import NetworkScan from './network/scan/NetworkScan';
import { inject, injectable } from 'inversify';
import { NETWORK_TYPES } from '../infrastructure/di/di-types';
import { NodeRepository } from './node/NodeRepository';
import { OrganizationRepository } from './organization/OrganizationRepository';
import { NetworkScanRepository } from './network/scan/NetworkScanRepository';
import { MeasurementsRollupService } from './measurement-aggregation/MeasurementsRollupService';
import { ScanResult } from './Scanner';
import { Result, err, ok } from 'neverthrow';
import { mapUnknownToError } from '../../core/utilities/mapUnknownToError';
import { CustomError } from '../../core/errors/CustomError';

export class NodesPersistenceError extends CustomError {
	constructor(cause: Error) {
		super('Error persisting nodes', NodesPersistenceError.name, cause);
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
		protected measurementRollupService: MeasurementsRollupService
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
			await this.measurementRollupService.rollupMeasurements(networkScan); //todo: split out
		} catch (e) {
			return err(new RollupMeasurementsError(mapUnknownToError(e)));
		}

		return ok(undefined);
	}

	async findLatest(): Promise<Result<ScanResult | null, Error>> {
		try {
			const networkScan = await this.networkScanRepository.findLatest();
			return await this.findScanResultAtNetworkScanTime(networkScan);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	async findPrevious(at: Date): Promise<Result<ScanResult | null, Error>> {
		try {
			const networkScan = await this.networkScanRepository.findPreviousAt(at);
			return await this.findScanResultAtNetworkScanTime(networkScan);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	async findAt(at: Date): Promise<Result<ScanResult | null, Error>> {
		try {
			const networkScan = await this.networkScanRepository.findAt(at);
			return await this.findScanResultAtNetworkScanTime(networkScan);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	private async findScanResultAtNetworkScanTime(
		networkScan: NetworkScan | undefined
	): Promise<Result<ScanResult | null, Error>> {
		if (!networkScan) return ok(null);

		const activeNodes = await this.nodeRepository.findActiveAtTimePoint(
			networkScan.time
		);
		const nodeScan = new NodeScan(networkScan.time, activeNodes);
		const organizations =
			await this.organizationRepository.findActiveAtTimePoint(networkScan.time);
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

	//Because node scans, organization scans and network scans are separate transactions, there is a possibility that a node scan is persisted but the network scan is not.
	//If we want to create a new scan based on the previous data, we have to make sure we fetch the latest node and organization scan data.
	// Because NodeScan and OrganizationScan entities are not persisted, we retrieve the active nodes and organizations.
	//this is in contrast with the findLatest method, which retrieves the latest network scan and then retrieves the node and organization data at that point in time.
	//This is necessary to show a consistent view of the network at a point in time in the current implementation.
	//See the file: ScanDecouplingTodo for more information on how we will move forward and make this business logic less confusing.
	public async findScanDataForUpdate(): Promise<
		Result<ScanResult | null, Error>
	> {
		//see ScanDecouplingTodo
		const networkScan = await this.networkScanRepository.findLatest();
		if (!networkScan) return ok(null);

		const activeNodes = await this.nodeRepository.findActive();
		const nodeScan = new NodeScan(networkScan.time, activeNodes);
		const organizations = await this.organizationRepository.findActive();
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
}
