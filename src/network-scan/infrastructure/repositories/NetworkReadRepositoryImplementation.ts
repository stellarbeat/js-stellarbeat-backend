import { err, ok, Result } from 'neverthrow';
import {
	Network as NetworkDTO,
	Organization as OrganizationDTO
} from '@stellarbeat/js-stellarbeat-shared';
import OrganizationSnapShotter from '../../domain/organization/snapshotting/OrganizationSnapShotter';
import { inject, injectable } from 'inversify';
import NetworkStatistics from '@stellarbeat/js-stellarbeat-shared/lib/network-statistics';
import NetworkScan from '../../domain/network/scan/NetworkScan';
import { CustomError } from '../../../core/errors/CustomError';
import * as LRUCache from 'lru-cache';
import { CORE_TYPES } from '../../../core/infrastructure/di/di-types';
import { NetworkMeasurementRepository } from '../../domain/network/NetworkMeasurementRepository';
import { NETWORK_TYPES } from '../di/di-types';
import { OrganizationMeasurementRepository } from '../../domain/organization/OrganizationMeasurementRepository';
import { NodeMeasurementRepository } from '../../domain/node/NodeMeasurementRepository';
import { NodeSnapShotRepository } from '../../domain/node/NodeSnapShotRepository';
import { NodeMeasurementDayRepository } from '../../domain/node/NodeMeasurementDayRepository';
import { NetworkScanRepository } from '../../domain/network/scan/NetworkScanRepository';
import { OrganizationRepository } from '../../domain/organization/OrganizationRepository';
import { NetworkReadRepository } from './NetworkReadRepository';
import { OrganizationMapper } from '../../services/OrganizationMapper';
import { NodeMapper } from '../../services/NodeMapper';
import { NodeRepository } from '../../domain/node/NodeRepository';
import { NodeSnapshotMapper } from '../../services/NodeSnapshotMapper';

export class IncompleteNetworkError extends CustomError {
	constructor(missing: string, cause?: Error) {
		super(
			'Incomplete network. Missing: ' + missing,
			IncompleteNetworkError.name,
			cause
		);
	}
}

@injectable()
export class NetworkReadRepositoryImplementation
	implements NetworkReadRepository
{
	protected networkCache = new LRUCache<string, NetworkDTO>({
		//needs a better solution. Need to look into typeorm hydration time, seems too high.
		max: 10 //we keep the value low, it's just intended to relieve some short load bursts
	});

	constructor(
		@inject(NETWORK_TYPES.NodeSnapshotRepository)
		protected nodeSnapShotRepository: NodeSnapShotRepository,
		protected organizationSnapShotter: OrganizationSnapShotter,
		@inject(NETWORK_TYPES.NetworkScanRepository)
		protected networkScanRepository: NetworkScanRepository,
		@inject(NETWORK_TYPES.NodeMeasurementRepository)
		protected nodeMeasurementRepository: NodeMeasurementRepository,
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		protected nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementRepository)
		protected organizationMeasurementRepository: OrganizationMeasurementRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementDayRepository)
		protected organizationMeasurementDayRepository: OrganizationMeasurementRepository,
		@inject(NETWORK_TYPES.NodeRepository)
		protected nodeRepository: NodeRepository,
		@inject(NETWORK_TYPES.OrganizationRepository)
		protected organizationRepository: OrganizationRepository,
		@inject(NETWORK_TYPES.NetworkMeasurementRepository)
		protected networkMeasurementRepository: NetworkMeasurementRepository,
		@inject(CORE_TYPES.networkName) protected networkName: string,
		@inject(CORE_TYPES.networkId) protected networkId: string
	) {}

	async getNetwork(
		time: Date = new Date()
	): Promise<Result<NetworkDTO | null, IncompleteNetworkError>> {
		const scan = await this.getNetworkScanAt(time);
		if (scan === null) return ok(null);

		const cacheKey: string = scan.time.toISOString();
		const cachedNetwork = this.networkCache.get(cacheKey);
		if (cachedNetwork) return Promise.resolve(ok(cachedNetwork));

		const networkResult = await this.getNetworkForScan(scan);

		if (networkResult.isErr()) return err(networkResult.error);

		if (networkResult.value === null) return ok(null);

		this.networkCache.set(
			scan.time.toISOString(),
			networkResult.value,
			24 * 60 * 60 * 1000
		);

		return ok(networkResult.value);
	}

	async getPreviousNetwork(
		currentNetworkTime: Date
	): Promise<Result<NetworkDTO | null, IncompleteNetworkError>> {
		const previousNetworkScan = await this.networkScanRepository.findPreviousAt(
			currentNetworkTime
		);

		if (!previousNetworkScan) return ok(null);

		return this.getNetworkForScan(previousNetworkScan);
	}

	protected async getNetworkForScan(
		scan: NetworkScan
	): Promise<Result<NetworkDTO, IncompleteNetworkError>> {
		const organizations = await this.getOrganizations(scan.time);
		const nodes = await this.getNodes(scan.time, organizations);
		const networkStatistics = await this.getNetworkStatistics(scan.time);

		if (!nodes) return err(new IncompleteNetworkError('Node measurements'));

		if (nodes.length === 0) return err(new IncompleteNetworkError('Nodes'));

		if (!networkStatistics)
			return err(new IncompleteNetworkError('Network measurements'));

		const network = new NetworkDTO(
			nodes,
			organizations,
			scan.time,
			scan.latestLedger.toString(),
			networkStatistics
		);

		network.id = this.networkId;
		network.name = this.networkName;

		return ok(network);
	}

	protected async getNetworkScanAt(time: Date): Promise<NetworkScan | null> {
		const scan = await this.networkScanRepository.findAt(time);

		if (!scan) return null;

		return scan;
	}

	protected async getNetworkStatistics(time: Date) {
		const measurement = await this.networkMeasurementRepository.findAt(
			'coming_soon',
			time
		);
		if (!measurement) return null; // a network without statistics is an incomplete network.

		const networkStatistics = new NetworkStatistics();

		for (const key of Object.keys(measurement)) {
			//Object.keys only returns properties that have a value in typescript
			if (key === 'time') continue;
			// @ts-ignore
			networkStatistics[key] = measurement[key];
		}

		return networkStatistics;
	}

	protected async getNodes(time: Date, organizations: OrganizationDTO[]) {
		const nodesToOrganizations = new Map<string, string>();
		organizations.forEach((organization) => {
			organization.validators.forEach((node) => {
				nodesToOrganizations.set(node, organization.id);
			});
		});

		const activeSnapShots = await this.nodeSnapShotRepository.findActiveAtTime(
			time
		);
		const measurements = await this.nodeMeasurementRepository.findAllAt(time);

		if (!measurements) return null;

		const measurementsMap = new Map(
			measurements.map((measurement) => {
				return [measurement.node.publicKey.value, measurement];
			})
		);

		const measurement24HourAverages =
			await this.nodeMeasurementRepository.findXDaysAverageAt(time, 1); //24 hours can be calculated 'live' quickly

		const measurement24HourAveragesMap = new Map(
			measurement24HourAverages.map((avg) => {
				return [avg.publicKey, avg];
			})
		);

		const measurement30DayAverages =
			await this.nodeMeasurementDayRepository.findXDaysAverageAt(time, 30);
		const measurement30DayAveragesMap = new Map(
			measurement30DayAverages.map((avg) => {
				return [avg.publicKey, avg];
			})
		);

		return activeSnapShots.map((snapShot) => {
			return NodeSnapshotMapper.toNodeDTO(
				time,
				snapShot,
				measurementsMap.get(snapShot.node.publicKey.value),
				measurement24HourAveragesMap.get(snapShot.node.publicKey.value),
				measurement30DayAveragesMap.get(snapShot.node.publicKey.value),
				nodesToOrganizations.get(snapShot.node.publicKey.value)
			);
		});
	}

	protected async getOrganizations(time: Date) {
		const activeSnapShots =
			await this.organizationSnapShotter.findSnapShotsActiveAtTime(time);
		const measurements = await this.organizationMeasurementRepository.findAllAt(
			time
		);
		const measurementsMap = new Map(
			measurements.map((measurement) => {
				return [measurement.organization.organizationId.value, measurement];
			})
		);

		const measurement24HourAverages =
			await this.organizationMeasurementRepository.findXDaysAverageAt(time, 1); //24 hours can be calculated 'live' quickly
		const measurement24HourAveragesMap = new Map(
			measurement24HourAverages.map((avg) => {
				return [avg.organizationId, avg];
			})
		);

		const measurement30DayAverages =
			await this.organizationMeasurementDayRepository.findXDaysAverageAt(
				time,
				30
			);
		const measurement30DayAveragesMap = new Map(
			measurement30DayAverages.map((avg) => {
				return [avg.organizationId, avg];
			})
		);

		return activeSnapShots.map((snapShot) => {
			if (!snapShot.organization.id)
				throw new Error(
					'OrganizationIdStorage has no id, impossible because it is an auto-incremented primary key'
				);
			return OrganizationMapper.toOrganizationDTO(
				snapShot,
				measurementsMap.get(snapShot.organization.organizationId.value),
				measurement24HourAveragesMap.get(snapShot.organization.id),
				measurement30DayAveragesMap.get(snapShot.organization.id)
			);
		});
	}
}
