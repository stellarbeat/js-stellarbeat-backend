import { err, ok, Result } from 'neverthrow';
import NodeSnapShotter from './SnapShotting/NodeSnapShotter';
import { NetworkUpdateRepository } from '../repositories/NetworkUpdateRepository';
import { Network } from '@stellarbeat/js-stellar-domain';
import { NodeMeasurementV2Repository } from '../repositories/NodeMeasurementV2Repository';
import { NodeMeasurementDayV2Repository } from '../repositories/NodeMeasurementDayV2Repository';
import OrganizationSnapShotter from './SnapShotting/OrganizationSnapShotter';
import { OrganizationMeasurementDayRepository } from '../repositories/OrganizationMeasurementDayRepository';
import { OrganizationMeasurementRepository } from '../repositories/OrganizationMeasurementRepository';
import { inject, injectable } from 'inversify';
import { LessThanOrEqual } from 'typeorm';
import { NodePublicKeyStorageRepository } from '../entities/NodePublicKeyStorage';
import { OrganizationIdStorageRepository } from '../entities/OrganizationIdStorage';
import { NetworkMeasurementRepository } from '../repositories/NetworkMeasurementRepository';
import NetworkStatistics from '@stellarbeat/js-stellar-domain/lib/network-statistics';
import NetworkUpdate from '../entities/NetworkUpdate';

@injectable()
export default class NetworkService {
	protected nodeSnapShotter: NodeSnapShotter;
	protected organizationSnapShotter: OrganizationSnapShotter;
	protected crawlV2Repository: NetworkUpdateRepository;
	protected nodeMeasurementV2Repository: NodeMeasurementV2Repository;
	protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
	protected organizationMeasurementRepository: OrganizationMeasurementRepository;
	protected organizationMeasurementDayRepository: OrganizationMeasurementDayRepository;
	protected nodePublicKeyStorageRepository: NodePublicKeyStorageRepository;
	protected organizationIdStorageRepository: OrganizationIdStorageRepository;
	protected networkMeasurementRepository: NetworkMeasurementRepository;

	constructor(
		nodeSnapShotter: NodeSnapShotter,
		organizationSnapShotter: OrganizationSnapShotter,
		crawlV2Repository: NetworkUpdateRepository,
		nodeMeasurementV2Repository: NodeMeasurementV2Repository,
		nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository,
		organizationMeasurementRepository: OrganizationMeasurementRepository,
		organizationMeasurementDayRepository: OrganizationMeasurementDayRepository,
		@inject('NodePublicKeyStorageRepository')
		nodePublicKeyStorageRepository: NodePublicKeyStorageRepository,
		@inject('OrganizationIdStorageRepository')
		organizationIdStorageRepository: OrganizationIdStorageRepository,
		networkMeasurementRepository: NetworkMeasurementRepository
	) {
		this.nodeSnapShotter = nodeSnapShotter;
		this.organizationSnapShotter = organizationSnapShotter;
		this.crawlV2Repository = crawlV2Repository;
		this.nodeMeasurementV2Repository = nodeMeasurementV2Repository;
		this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
		this.organizationMeasurementRepository = organizationMeasurementRepository;
		this.organizationMeasurementDayRepository =
			organizationMeasurementDayRepository;
		this.nodePublicKeyStorageRepository = nodePublicKeyStorageRepository;
		this.organizationIdStorageRepository = organizationIdStorageRepository;
		this.networkMeasurementRepository = networkMeasurementRepository;
	}

	async getNetwork(time: Date = new Date()): Promise<Result<Network, Error>> {
		const crawlResult = await this.getCrawlAt(time);
		if (crawlResult.isErr()) return err(crawlResult.error);

		const nodes = await this.getNodes(crawlResult.value.time);
		const organizations = await this.getOrganizations(crawlResult.value.time);
		const networkStatistics = await this.getNetworkStatistics(
			crawlResult.value.time
		);

		return ok(
			new Network(
				nodes,
				organizations,
				crawlResult.value.time,
				crawlResult.value.latestLedger.toString(),
				networkStatistics
			)
		);
	}

	protected async getCrawlAt(
		time: Date
	): Promise<Result<NetworkUpdate, Error>> {
		// @ts-ignore
		const crawl = await this.crawlV2Repository.findOne({
			where: { time: LessThanOrEqual(time), completed: true },
			order: { time: 'DESC' },
			take: 1
		});

		if (!crawl)
			return err(
				new Error(
					'No completed crawls present in database, please use seed script'
				)
			);

		return ok(crawl);
	}

	async getNetworkStatistics(time: Date) {
		const measurement = await this.networkMeasurementRepository.findOne({
			where: {
				time: time
			}
		});
		if (!measurement) return undefined;

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
