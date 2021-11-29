import { err, ok, Result } from 'neverthrow';
import NodeSnapShotter from '../infrastructure/database/snapshotting/NodeSnapShotter';
import { NetworkUpdateRepository } from '../infrastructure/database/repositories/NetworkUpdateRepository';
import { Network } from '@stellarbeat/js-stellar-domain';
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
import NetworkUpdate from '../domain/NetworkUpdate';
import { CustomError } from '../../shared/errors/CustomError';
import * as LRUCache from 'lru-cache';
import Kernel from '../../shared/core/Kernel';

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
export default class NetworkReadRepository {
	protected networkCache = new LRUCache<string, Network>({
		max: 1000 //to prevent memory leaks
	});

	protected kernel?: Kernel;

	constructor(
		protected nodeSnapShotter: NodeSnapShotter,
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
		protected networkMeasurementRepository: NetworkMeasurementRepository
	) {
		this.nodeSnapShotter = nodeSnapShotter;
		this.organizationSnapShotter = organizationSnapShotter;
		this.networkUpdateRepository = networkUpdateRepository;
		this.nodeMeasurementV2Repository = nodeMeasurementV2Repository;
		this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
		this.organizationMeasurementRepository = organizationMeasurementRepository;
		this.organizationMeasurementDayRepository =
			organizationMeasurementDayRepository;
		this.nodePublicKeyStorageRepository = nodePublicKeyStorageRepository;
		this.organizationIdStorageRepository = organizationIdStorageRepository;
		this.networkMeasurementRepository = networkMeasurementRepository;
	}

	async getNetwork(
		time: Date = new Date()
	): Promise<Result<Network | null, IncompleteNetworkError>> {
		const cacheKey: string = time.toISOString();
		const cachedNetwork = this.networkCache.get(cacheKey);
		if (cachedNetwork) return Promise.resolve(ok(cachedNetwork));

		const networkUpdate = await this.getNetworkUpdateAt(time);
		if (networkUpdate === null) return ok(null);

		const networkResult = await this.getNetworkForNetworkUpdate(networkUpdate);
		if (networkResult.isErr()) return err(networkResult.error);

		if (networkResult.value === null) return ok(null);

		this.networkCache.set(
			networkResult.value.time.toISOString(), //we don't want to use any random time as a cache index
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

		if (!this.kernel) this.kernel = await Kernel.getInstance();

		network.id = this.kernel.config.networkId;
		network.name = this.kernel.config.networkName
			? this.kernel.config.networkName
			: 'Stellar Public network';
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

	async getNetworkStatistics(time: Date) {
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

	async getNodes(time: Date) {
		const activeSnapShots =
			await this.nodeSnapShotter.findSnapShotsActiveAtTime(time);
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

	async getOrganizations(time: Date) {
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

	async getNodeDayStatistics(publicKey: string, from: Date, to: Date) {
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

	async getOrganizationDayStatistics(
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
