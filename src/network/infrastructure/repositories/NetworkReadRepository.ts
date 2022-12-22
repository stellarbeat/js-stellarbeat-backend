import { err, ok, Result } from 'neverthrow';
import { NetworkUpdateRepository } from '../database/repositories/NetworkUpdateRepository';
import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { NodeMeasurementDayV2Repository } from '../database/repositories/NodeMeasurementDayV2Repository';
import OrganizationSnapShotter from '../database/snapshotting/OrganizationSnapShotter';
import { OrganizationMeasurementDayRepository } from '../database/repositories/OrganizationMeasurementDayRepository';
import { inject, injectable } from 'inversify';
import { LessThan, LessThanOrEqual } from 'typeorm';
import { PublicKeyRepository } from '../../domain/PublicKey';
import { OrganizationIdRepository } from '../../domain/OrganizationId';
import NetworkStatistics from '@stellarbeat/js-stellar-domain/lib/network-statistics';
import NetworkUpdate from '../../domain/NetworkUpdate';
import { CustomError } from '../../../core/errors/CustomError';
import * as LRUCache from 'lru-cache';
import { CORE_TYPES } from '../../../core/infrastructure/di/di-types';
import NodeSnapShotRepository from '../database/repositories/NodeSnapShotRepository';
import { NetworkMeasurementRepository } from '../../domain/measurement/NetworkMeasurementRepository';
import { NETWORK_TYPES } from '../di/di-types';
import { OrganizationMeasurementRepository } from '../../domain/measurement/OrganizationMeasurementRepository';
import { NodeMeasurementRepository } from '../../domain/measurement/NodeMeasurementRepository';

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
		protected nodeSnapShotRepository: NodeSnapShotRepository,
		protected organizationSnapShotter: OrganizationSnapShotter,
		protected networkUpdateRepository: NetworkUpdateRepository,
		@inject(NETWORK_TYPES.NodeMeasurementRepository)
		protected nodeMeasurementV2Repository: NodeMeasurementRepository,
		protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository,
		@inject(NETWORK_TYPES.OrganizationMeasurementRepository)
		protected organizationMeasurementRepository: OrganizationMeasurementRepository,
		protected organizationMeasurementDayRepository: OrganizationMeasurementDayRepository,
		@inject('NodePublicKeyStorageRepository')
		protected nodePublicKeyStorageRepository: PublicKeyRepository,
		@inject('OrganizationIdStorageRepository')
		protected organizationIdStorageRepository: OrganizationIdRepository,
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
		const previousNetworkUpdate = await this.networkUpdateRepository.findOne({
			where: { time: LessThan(currentNetworkTime), completed: true },
			order: { time: 'DESC' }
		});

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
		const networkUpdate = await this.networkUpdateRepository.findOne({
			where: { time: LessThanOrEqual(time), completed: true },
			order: { time: 'DESC' }
		});

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
		const measurements = await this.nodeMeasurementV2Repository.findAllAt(time);

		if (!measurements) return null;

		const measurementsMap = new Map(
			measurements.map((measurement) => {
				return [measurement.nodePublicKeyStorage.value, measurement];
			})
		);

		const measurement24HourAverages =
			await this.nodeMeasurementV2Repository.findXDaysAverageAt(time, 1); //24 hours can be calculated 'live' quickly
		const measurement24HourAveragesMap = new Map(
			measurement24HourAverages.map((avg) => {
				return [avg.nodeStoragePublicKeyId, avg];
			})
		);

		const measurement30DayAverages =
			await this.nodeMeasurementDayV2Repository.findXDaysAverageAt(time, 30);
		const measurement30DayAveragesMap = new Map(
			measurement30DayAverages.map((avg) => {
				return [avg.nodeStoragePublicKeyId, avg];
			})
		);

		return activeSnapShots.map((snapShot) => {
			if (!snapShot.nodePublicKey.id)
				throw new Error(
					'Node public key id is null, impossible because it is a primary key'
				);
			return snapShot.toNode(
				time,
				measurementsMap.get(snapShot.nodePublicKey.value),
				measurement24HourAveragesMap.get(snapShot.nodePublicKey.id),
				measurement30DayAveragesMap.get(snapShot.nodePublicKey.id)
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
				return [measurement.organizationIdStorage.organizationId, measurement];
			})
		);

		const measurement24HourAverages =
			await this.organizationMeasurementRepository.findXDaysAverageAt(time, 1); //24 hours can be calculated 'live' quickly
		const measurement24HourAveragesMap = new Map(
			measurement24HourAverages.map((avg) => {
				return [avg.organizationIdStorageId, avg];
			})
		);

		const measurement30DayAverages =
			await this.organizationMeasurementDayRepository.findXDaysAverageAt(
				time,
				30
			);
		const measurement30DayAveragesMap = new Map(
			measurement30DayAverages.map((avg) => {
				return [avg.organizationIdStorageId, avg];
			})
		);

		return activeSnapShots.map((snapShot) => {
			if (!snapShot.organizationIdStorage.id)
				throw new Error(
					'OrganizationIdStorage has no id, impossible because it is an autoincremented primary key'
				);
			return snapShot.toOrganization(
				time,
				measurementsMap.get(snapShot.organizationIdStorage.organizationId),
				measurement24HourAveragesMap.get(snapShot.organizationIdStorage.id),
				measurement30DayAveragesMap.get(snapShot.organizationIdStorage.id)
			);
		});
	}

	protected async getNodeDayStatistics(
		publicKey: string,
		from: Date,
		to: Date
	) {
		const nodePublicKey = await this.nodePublicKeyStorageRepository.findOne({
			where: {
				value: publicKey
			}
		});

		if (!nodePublicKey) {
			return [];
		}

		return await this.nodeMeasurementDayV2Repository.findBetween(
			nodePublicKey,
			from,
			to
		);
	}

	protected async getOrganizationDayStatistics(
		organizationId: string,
		from: Date,
		to: Date
	) {
		const organizationIdStorage =
			await this.organizationIdStorageRepository.findOne({
				where: {
					organizationId: organizationId
				}
			});

		if (!organizationIdStorage) {
			return [];
		}

		return await this.organizationMeasurementDayRepository.findBetween(
			organizationIdStorage,
			from,
			to
		);
	}
}
