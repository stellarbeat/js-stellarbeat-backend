import { err, ok, Result } from 'neverthrow';
import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotter from '../../domain/snapshotting/OrganizationSnapShotter';
import { inject, injectable } from 'inversify';
import { VersionedOrganizationRepository } from '../../domain/VersionedOrganization';
import NetworkStatistics from '@stellarbeat/js-stellar-domain/lib/network-statistics';
import NetworkUpdate from '../../domain/NetworkUpdate';
import { CustomError } from '../../../core/errors/CustomError';
import * as LRUCache from 'lru-cache';
import { CORE_TYPES } from '../../../core/infrastructure/di/di-types';
import { NetworkMeasurementRepository } from '../../domain/measurement/NetworkMeasurementRepository';
import { NETWORK_TYPES } from '../di/di-types';
import { OrganizationMeasurementRepository } from '../../domain/measurement/OrganizationMeasurementRepository';
import { NodeMeasurementRepository } from '../../domain/measurement/NodeMeasurementRepository';
import { VersionedNodeRepository } from '../../domain/VersionedNode';
import { NodeSnapShotRepository } from '../../domain/snapshotting/NodeSnapShotRepository';
import { NodeMeasurementDayRepository } from '../../domain/measurement/NodeMeasurementDayRepository';
import { NetworkUpdateRepository } from '../../domain/NetworkUpdateRepository';

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
	protected networkCache = new LRUCache<string, Network>({
		//needs a better solution. Need to look into typeorm hydration time, seems too high.
		max: 10 //we keep the value low, it's just intended to relieve some short load bursts
	});

	constructor(
		@inject(NETWORK_TYPES.NodeSnapshotRepository)
		protected nodeSnapShotRepository: NodeSnapShotRepository,
		protected organizationSnapShotter: OrganizationSnapShotter,
		@inject(NETWORK_TYPES.NetworkUpdateRepository)
		protected networkUpdateRepository: NetworkUpdateRepository,
		@inject(NETWORK_TYPES.NodeMeasurementRepository)
		protected nodeMeasurementRepository: NodeMeasurementRepository,
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		protected nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementRepository)
		protected organizationMeasurementRepository: OrganizationMeasurementRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementDayRepository)
		protected organizationMeasurementDayRepository: OrganizationMeasurementRepository,
		@inject('NodePublicKeyStorageRepository')
		protected versionedNodeRepository: VersionedNodeRepository,
		@inject('OrganizationIdStorageRepository')
		protected organizationRepository: VersionedOrganizationRepository,
		@inject(NETWORK_TYPES.NetworkMeasurementRepository)
		protected networkMeasurementRepository: NetworkMeasurementRepository,
		@inject(CORE_TYPES.networkName) protected networkName: string,
		@inject(CORE_TYPES.networkId) protected networkId: string
	) {}

	async getNetwork(
		time: Date = new Date()
	): Promise<Result<Network | null, IncompleteNetworkError>> {
		const networkUpdate = await this.getNetworkUpdateAt(time);
		if (networkUpdate === null) return ok(null);

		const cacheKey: string = networkUpdate.time.toISOString();
		const cachedNetwork = this.networkCache.get(cacheKey);
		if (cachedNetwork) return Promise.resolve(ok(cachedNetwork));

		const networkResult = await this.getNetworkForNetworkUpdate(networkUpdate);

		if (networkResult.isErr()) return err(networkResult.error);

		if (networkResult.value === null) return ok(null);

		this.networkCache.set(
			networkUpdate.time.toISOString(),
			networkResult.value,
			24 * 60 * 60 * 1000
		);

		return ok(networkResult.value);
	}

	async getPreviousNetwork(
		currentNetworkTime: Date
	): Promise<Result<Network | null, IncompleteNetworkError>> {
		const previousNetworkUpdate =
			await this.networkUpdateRepository.findPreviousAt(currentNetworkTime);

		if (!previousNetworkUpdate) return ok(null);

		return this.getNetworkForNetworkUpdate(previousNetworkUpdate);
	}

	protected async getNetworkForNetworkUpdate(
		networkUpdate: NetworkUpdate
	): Promise<Result<Network, IncompleteNetworkError>> {
		const nodes = await this.getNodes(networkUpdate.time);
		const organizations = await this.getOrganizations(networkUpdate.time);
		const networkStatistics = await this.getNetworkStatistics(
			networkUpdate.time
		);

		if (!nodes) return err(new IncompleteNetworkError('Node measurements'));

		if (nodes.length === 0) return err(new IncompleteNetworkError('Nodes'));

		if (!networkStatistics)
			return err(new IncompleteNetworkError('Network measurements'));

		const network = new Network(
			nodes,
			organizations,
			networkUpdate.time,
			networkUpdate.latestLedger.toString(),
			networkStatistics
		);

		network.id = this.networkId;
		network.name = this.networkName;

		return ok(network);
	}

	protected async getNetworkUpdateAt(
		time: Date
	): Promise<NetworkUpdate | null> {
		const networkUpdate = await this.networkUpdateRepository.findAt(time);

		if (!networkUpdate) return null;

		return networkUpdate;
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

	protected async getNodes(time: Date) {
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
				return [avg.nodeId, avg];
			})
		);

		const measurement30DayAverages =
			await this.nodeMeasurementDayRepository.findXDaysAverageAt(time, 30);
		const measurement30DayAveragesMap = new Map(
			measurement30DayAverages.map((avg) => {
				return [avg.nodeId, avg];
			})
		);

		return activeSnapShots.map((snapShot) => {
			if (!snapShot.node.id)
				throw new Error(
					'Node public key id is null, impossible because it is a primary key'
				);
			return snapShot.toNode(
				time,
				measurementsMap.get(snapShot.node.publicKey.value),
				measurement24HourAveragesMap.get(snapShot.node.id),
				measurement30DayAveragesMap.get(snapShot.node.id)
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
				return [measurement.organization.organizationId, measurement];
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
			return snapShot.toOrganization(
				time,
				measurementsMap.get(snapShot.organization.organizationId),
				measurement24HourAveragesMap.get(snapShot.organization.id),
				measurement30DayAveragesMap.get(snapShot.organization.id)
			);
		});
	}
}
