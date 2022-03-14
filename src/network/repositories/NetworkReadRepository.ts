import { err, ok, Result } from 'neverthrow';
import { NetworkUpdateRepository } from '../infrastructure/database/repositories/NetworkUpdateRepository';
import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { NodeMeasurementV2Repository } from '../infrastructure/database/repositories/NodeMeasurementV2Repository';
import { NodeMeasurementDayV2Repository } from '../infrastructure/database/repositories/NodeMeasurementDayV2Repository';
import OrganizationSnapShotter from '../infrastructure/database/snapshotting/OrganizationSnapShotter';
import { OrganizationMeasurementDayRepository } from '../infrastructure/database/repositories/OrganizationMeasurementDayRepository';
import { OrganizationMeasurementRepository } from '../infrastructure/database/repositories/OrganizationMeasurementRepository';
import { inject, injectable } from 'inversify';
import { LessThan, LessThanOrEqual } from 'typeorm';
import { NodePublicKeyStorageRepository } from '../infrastructure/database/entities/NodePublicKeyStorage';
import { OrganizationIdStorageRepository } from '../infrastructure/database/entities/OrganizationIdStorage';
import { NetworkMeasurementRepository } from '../infrastructure/database/repositories/NetworkMeasurementRepository';
import NetworkStatistics from '@stellarbeat/js-stellar-domain/lib/network-statistics';
import NetworkUpdate from '../../network-update/domain/NetworkUpdate';
import { CustomError } from '../../shared/errors/CustomError';
import * as LRUCache from 'lru-cache';
import { TYPES } from '../../shared/core/di-types';
import NodeSnapShotRepository from '../infrastructure/database/repositories/NodeSnapShotRepository';

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
		protected nodeMeasurementV2Repository: NodeMeasurementV2Repository,
		protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository,
		protected organizationMeasurementRepository: OrganizationMeasurementRepository,
		protected organizationMeasurementDayRepository: OrganizationMeasurementDayRepository,
		@inject('NodePublicKeyStorageRepository')
		protected nodePublicKeyStorageRepository: NodePublicKeyStorageRepository,
		@inject('OrganizationIdStorageRepository')
		protected organizationIdStorageRepository: OrganizationIdStorageRepository,
		protected networkMeasurementRepository: NetworkMeasurementRepository,
		@inject(TYPES.networkName) protected networkName: string,
		@inject(TYPES.networkId) protected networkId: string
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
		const measurement = await this.networkMeasurementRepository.findOne({
			where: {
				time: time
			}
		});
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
		const measurements = await this.nodeMeasurementV2Repository.find({
			where: {
				time: time
			}
		});

		if (!measurements) return null;

		const measurementsMap = new Map(
			measurements.map((measurement) => {
				return [measurement.nodePublicKeyStorage.publicKey, measurement];
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

		return activeSnapShots.map((snapShot) =>
			snapShot.toNode(
				time,
				measurementsMap.get(snapShot.nodePublicKey.publicKey),
				measurement24HourAveragesMap.get(snapShot.nodePublicKey.id),
				measurement30DayAveragesMap.get(snapShot.nodePublicKey.id)
			)
		);
	}

	protected async getOrganizations(time: Date) {
		const activeSnapShots =
			await this.organizationSnapShotter.findSnapShotsActiveAtTime(time);
		const measurements = await this.organizationMeasurementRepository.find({
			where: {
				time: time
			}
		});
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

		return activeSnapShots.map((snapShot) =>
			snapShot.toOrganization(
				time,
				measurementsMap.get(snapShot.organizationIdStorage.organizationId),
				measurement24HourAveragesMap.get(snapShot.organizationIdStorage.id),
				measurement30DayAveragesMap.get(snapShot.organizationIdStorage.id)
			)
		);
	}

	protected async getNodeDayStatistics(
		publicKey: string,
		from: Date,
		to: Date
	) {
		const nodePublicKey = await this.nodePublicKeyStorageRepository.findOne({
			where: {
				publicKey: publicKey
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
