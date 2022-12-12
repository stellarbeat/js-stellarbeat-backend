import { Container, decorate, injectable } from 'inversify';
import {
	Connection,
	createConnection,
	getCustomRepository,
	getRepository,
	Repository
} from 'typeorm';
import { Config, getConfigFromEnv } from '../config/Config';
import { NodeMeasurementV2Repository } from '../../network/infrastructure/database/repositories/NodeMeasurementV2Repository';
import { NetworkMeasurementRepository } from '../../network/infrastructure/database/repositories/NetworkMeasurementRepository';
import { NetworkUpdateRepository } from '../../network/infrastructure/database/repositories/NetworkUpdateRepository';
import { NetworkMeasurementDayRepository } from '../../network/infrastructure/database/repositories/NetworkMeasurementDayRepository';
import { NetworkMeasurementMonthRepository } from '../../network/infrastructure/database/repositories/NetworkMeasurementMonthRepository';
import { NodeMeasurementDayV2Repository } from '../../network/infrastructure/database/repositories/NodeMeasurementDayV2Repository';
import OrganizationSnapShotRepository from '../../network/infrastructure/database/repositories/OrganizationSnapShotRepository';
import NodeSnapShotRepository from '../../network/infrastructure/database/repositories/NodeSnapShotRepository';
import { OrganizationMeasurementDayRepository } from '../../network/infrastructure/database/repositories/OrganizationMeasurementDayRepository';
import { OrganizationMeasurementRepository } from '../../network/infrastructure/database/repositories/OrganizationMeasurementRepository';
import NodePublicKeyStorage, {
	NodePublicKeyStorageRepository
} from '../../network/infrastructure/database/entities/NodePublicKeyStorage';
import OrganizationIdStorage, {
	OrganizationIdStorageRepository
} from '../../network/infrastructure/database/entities/OrganizationIdStorage';
import MeasurementRollup from '../../network/infrastructure/database/entities/MeasurementRollup';
import OrganizationMeasurement from '../../network/infrastructure/database/entities/OrganizationMeasurement';
import NetworkMeasurement from '../../network/infrastructure/database/entities/NetworkMeasurement';
import NodeGeoDataStorage from '../../network/infrastructure/database/entities/NodeGeoDataStorage';
import NodeQuorumSetStorage from '../../network/infrastructure/database/entities/NodeQuorumSetStorage';
import SnapShotter from '../../network/infrastructure/database/snapshotting/SnapShotter';
import NodeSnapShotter from '../../network/infrastructure/database/snapshotting/NodeSnapShotter';
import OrganizationSnapShotter from '../../network/infrastructure/database/snapshotting/OrganizationSnapShotter';
import NodeSnapShotArchiver from '../../network/infrastructure/database/snapshotting/NodeSnapShotArchiver';
import { NetworkWriteRepository } from '../../network/repositories/NetworkWriteRepository';
import { NetworkReadRepositoryImplementation } from '../../network/repositories/NetworkReadRepository';
import { CrawlerService } from '../../network/domain/CrawlerService';
import NodeMeasurementService from '../../network/infrastructure/database/repositories/NodeMeasurementService';
import OrganizationMeasurementService from '../../network/infrastructure/database/repositories/OrganizationMeasurementService';
import MeasurementsRollupService from '../../network/infrastructure/database/measurements-rollup/MeasurementsRollupService';
import FbasAnalyzerService from '../../network/domain/FbasAnalyzerService';
import NodeSnapShotFactory from '../../network/infrastructure/database/snapshotting/factory/NodeSnapShotFactory';
import OrganizationSnapShotFactory from '../../network/infrastructure/database/snapshotting/factory/OrganizationSnapShotFactory';
import { HorizonService } from '../../network/domain/HorizonService';
import { HomeDomainUpdater } from '../../network/domain/HomeDomainUpdater';
import { TomlService } from '../../network/domain/TomlService';
import { HistoryService } from '../../network/domain/history/HistoryService';
import {
	GeoDataService,
	IpStackGeoDataService
} from '../../network/domain/IpStackGeoDataService';
import { FullValidatorUpdater } from '../../network/domain/FullValidatorUpdater';
import {
	DummyJSONArchiver,
	S3Archiver
} from '../../network/domain/archiver/S3Archiver';
import {
	DeadManSnitchHeartBeater,
	DummyHeartBeater,
	HeartBeater
} from '../../network/domain/DeadManSnitchHeartBeater';
import {
	ConsoleExceptionLogger,
	ExceptionLogger,
	SentryExceptionLogger
} from '../services/ExceptionLogger';
import { UpdateNetwork } from '../../network/use-cases/update-network/UpdateNetwork';
import { HttpService } from '../services/HttpService';
import { createCrawler } from '@stellarbeat/js-stellar-node-crawler';
import { Logger, PinoLogger } from '../services/PinoLogger';
import { JSONArchiver } from '../../network/domain/archiver/JSONArchiver';
import { TypeOrmEventRepository } from '../../notifications/infrastructure/database/repositories/TypeOrmEventRepository';
import { TypeOrmSubscriberRepository } from '../../notifications/infrastructure/database/repositories/TypeOrmSubscriberRepository';
import { SubscriberRepository } from '../../notifications/domain/subscription/SubscriberRepository';
import { EventRepository } from '../../notifications/domain/event/EventRepository';
import { Notify } from '../../notifications/use-cases/determine-events-and-notify-subscribers/Notify';
import { TYPES } from './di/di-types';
import { NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { load as loadHistory } from '../../history-scan/infrastructure/di/container';
import { load as loadNetworkUpdate } from '../../network/infrastructure/di/container';
import { load as loadNetworkEventNotifications } from '../../notifications/infrastructure/di/container';
import { AxiosHttpService } from './http/AxiosHttpService';
import { HttpQueue } from '../services/HttpQueue';

export default class Kernel {
	private static instance?: Kernel;
	protected _container?: Container;
	public config!: Config;

	private constructor() {
		try {
			decorate(injectable(), Connection);
			decorate(injectable(), Repository);
			// eslint-disable-next-line no-empty
		} catch (e) {}
		//a second getInstance cannot redecorate the above classes
	}

	static async getInstance(config?: Config) {
		if (!Kernel.instance) {
			if (!config) {
				const configResult = getConfigFromEnv();
				if (configResult.isErr()) {
					throw configResult.error;
				}

				config = configResult.value;
			}
			Kernel.instance = new Kernel();
			Kernel.instance.config = config;
			await Kernel.instance.initializeContainer(config);
		}

		return Kernel.instance;
	}

	async close() {
		await this.container.get(Connection).close();
		Kernel.instance = undefined;
	}

	private async initializeContainer(config: Config): Promise<void> {
		this._container = new Container();
		let connectionName: string | undefined = undefined;
		if (config.nodeEnv === 'test') connectionName = 'test';
		this._container
			.bind<string>(TYPES.networkId)
			.toConstantValue(config.networkId);
		this._container
			.bind<string>(TYPES.networkName)
			.toConstantValue(config.networkName);

		await this.loadAsync(config, connectionName);
		if (config.enableNotifications) {
			loadNetworkEventNotifications(this.container, config);
		}

		this.load(config);
		loadHistory(this.container, connectionName, config);
		loadNetworkUpdate(this.container); //todo: move other services
	}

	get container(): Container {
		if (this._container === undefined)
			throw new Error('Kernel not initialized');

		return this._container;
	}

	async shutdown() {
		const connection = this.container.get(Connection);
		await connection.close();
	}

	async loadAsync(config: Config, connectionName: string | undefined) {
		let connection: Connection;
		if (connectionName) {
			connection = await createConnection(connectionName);
		} else connection = await createConnection();

		this.container
			.bind<Connection>(Connection)
			.toDynamicValue(() => {
				return connection;
			})
			.inRequestScope();
		this.container
			.bind<NodeMeasurementV2Repository>(NodeMeasurementV2Repository)
			.toDynamicValue(() => {
				return getCustomRepository(NodeMeasurementV2Repository, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<SubscriberRepository>('SubscriberRepository')
			.toDynamicValue(() => {
				return getCustomRepository(TypeOrmSubscriberRepository, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<NetworkMeasurementRepository>(NetworkMeasurementRepository)
			.toDynamicValue(() => {
				return getCustomRepository(
					NetworkMeasurementRepository,
					connectionName
				);
			})
			.inRequestScope();
		this.container
			.bind<NetworkUpdateRepository>(NetworkUpdateRepository)
			.toDynamicValue(() => {
				return getCustomRepository(NetworkUpdateRepository, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<NetworkMeasurementDayRepository>(NetworkMeasurementDayRepository)
			.toDynamicValue(() => {
				return getCustomRepository(
					NetworkMeasurementDayRepository,
					connectionName
				);
			})
			.inRequestScope();
		this.container
			.bind<NetworkMeasurementMonthRepository>(
				NetworkMeasurementMonthRepository
			)
			.toDynamicValue(() => {
				return getCustomRepository(
					NetworkMeasurementMonthRepository,
					connectionName
				);
			})
			.inRequestScope();
		this.container
			.bind<NodeMeasurementDayV2Repository>(NodeMeasurementDayV2Repository)
			.toDynamicValue(() => {
				return getCustomRepository(
					NodeMeasurementDayV2Repository,
					connectionName
				);
			})
			.inRequestScope();
		this.container
			.bind<OrganizationSnapShotRepository>(OrganizationSnapShotRepository)
			.toDynamicValue(() => {
				return getCustomRepository(
					OrganizationSnapShotRepository,
					connectionName
				);
			})
			.inRequestScope();
		this.container
			.bind<NodeSnapShotRepository>(NodeSnapShotRepository)
			.toDynamicValue(() => {
				return getCustomRepository(NodeSnapShotRepository, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<OrganizationMeasurementDayRepository>(
				OrganizationMeasurementDayRepository
			)
			.toDynamicValue(() => {
				return getCustomRepository(
					OrganizationMeasurementDayRepository,
					connectionName
				);
			})
			.inRequestScope();
		this.container
			.bind<OrganizationMeasurementRepository>(
				OrganizationMeasurementRepository
			)
			.toDynamicValue(() => {
				return getCustomRepository(
					OrganizationMeasurementRepository,
					connectionName
				);
			})
			.inRequestScope();
		this.container
			.bind<NodePublicKeyStorageRepository>('NodePublicKeyStorageRepository')
			.toDynamicValue(() => {
				return getRepository(NodePublicKeyStorage, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<OrganizationIdStorageRepository>('OrganizationIdStorageRepository')
			.toDynamicValue(() => {
				return getRepository(OrganizationIdStorage, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<Repository<MeasurementRollup>>('Repository<MeasurementRollup>')
			.toDynamicValue(() => {
				return getRepository(MeasurementRollup, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<Repository<OrganizationMeasurement>>(
				'Repository<OrganizationMeasurement>'
			)
			.toDynamicValue(() => {
				return getRepository(OrganizationMeasurement, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<Repository<NetworkMeasurement>>('Repository<NetworkMeasurement>')
			.toDynamicValue(() => {
				return getRepository(NetworkMeasurement, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<Repository<NodeGeoDataStorage>>('Repository<NodeGeoDataStorage>')
			.toDynamicValue(() => {
				return getRepository(NodeGeoDataStorage, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<Repository<NodeQuorumSetStorage>>(
				'Repository<NodeQuorumSetStorage>'
			)
			.toDynamicValue(() => {
				return getRepository(NodeQuorumSetStorage, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<EventRepository>('EventRepository')
			.toDynamicValue(() => {
				return new TypeOrmEventRepository(
					this.container.get(NodeMeasurementV2Repository),
					this.container.get(OrganizationMeasurementRepository)
				);
			});
	}

	load(config: Config) {
		this.container
			.bind<Logger>('Logger')
			.toDynamicValue(() => {
				return new PinoLogger(config.logLevel);
			})
			.inSingletonScope();
		this.container
			.bind<HttpService>('HttpService')
			.toDynamicValue(() => {
				return new AxiosHttpService(config.userAgent);
			})
			.inSingletonScope();
		this.container.bind<SnapShotter>(SnapShotter).toSelf();
		this.container.bind<NodeSnapShotter>(NodeSnapShotter).toSelf();
		this.container
			.bind<OrganizationSnapShotter>(OrganizationSnapShotter)
			.toSelf();
		this.container.bind<NodeSnapShotArchiver>(NodeSnapShotArchiver).toSelf();
		this.container
			.bind<NetworkWriteRepository>(NetworkWriteRepository)
			.toSelf();
		this.container
			.bind<NetworkReadRepository>(TYPES.NetworkReadRepository)
			.to(NetworkReadRepositoryImplementation)
			.inSingletonScope(); //make more efficient use of the cache
		this.container.bind<CrawlerService>(CrawlerService).toDynamicValue(() => {
			const crawler = createCrawler(
				config.crawlerConfig,
				this.container.get<Logger>('Logger').getRawLogger()
			); //todo:dependencies should accept generic logger interface
			return new CrawlerService(
				config.trustedTopTierNodes,
				config.dynamicTopTierNodes,
				crawler,
				this.container.get<Logger>('Logger')
			);
		});
		this.container
			.bind<NodeMeasurementService>(NodeMeasurementService)
			.toSelf();
		this.container
			.bind<OrganizationMeasurementService>(OrganizationMeasurementService)
			.toSelf();
		this.container
			.bind<MeasurementsRollupService>(MeasurementsRollupService)
			.toSelf();
		this.container.bind<FbasAnalyzerService>(FbasAnalyzerService).toSelf();
		this.container.bind<NodeSnapShotFactory>(NodeSnapShotFactory).toSelf();
		this.container
			.bind<OrganizationSnapShotFactory>(OrganizationSnapShotFactory)
			.toSelf();
		this.container.bind<HorizonService>(HorizonService).toDynamicValue(() => {
			return new HorizonService(
				this.container.get<HttpService>('HttpService'),
				config.horizonUrl
			);
		});
		this.container.bind<HomeDomainUpdater>(HomeDomainUpdater).toSelf();
		this.container.bind<TomlService>(TomlService).toSelf();
		this.container.bind<HistoryService>(HistoryService).toSelf();

		this.container.bind<GeoDataService>('GeoDataService').toDynamicValue(() => {
			return new IpStackGeoDataService(
				this.container.get<Logger>('Logger'),
				this.container.get<HttpService>('HttpService'),
				config.ipStackAccessKey
			);
		});

		this.container.bind<FullValidatorUpdater>(FullValidatorUpdater).toSelf();
		this.container.bind<JSONArchiver>('JSONArchiver').toDynamicValue(() => {
			if (
				config.enableS3Backup &&
				config.s3Secret &&
				config.s3AccessKeyId &&
				config.s3BucketName
			)
				return new S3Archiver(
					config.s3AccessKeyId,
					config.s3Secret,
					config.s3BucketName,
					config.nodeEnv
				);
			return new DummyJSONArchiver(this.container.get<Logger>('Logger'));
		});
		this.container.bind<HeartBeater>('HeartBeater').toDynamicValue(() => {
			if (config.enableDeadManSwitch && config.deadManSwitchUrl)
				return new DeadManSnitchHeartBeater(
					this.container.get<HttpService>('HttpService'),
					config.deadManSwitchUrl
				);
			return new DummyHeartBeater();
		});

		this.container
			.bind<ExceptionLogger>('ExceptionLogger')
			.toDynamicValue(() => {
				if (config.enableSentry && config.sentryDSN)
					return new SentryExceptionLogger(
						config.sentryDSN,
						this.container.get<Logger>('Logger')
					);
				else return new ConsoleExceptionLogger();
			});
		this.container.bind<UpdateNetwork>(UpdateNetwork).toDynamicValue(() => {
			return new UpdateNetwork(
				config.loop,
				this.container.get<NetworkReadRepository>(TYPES.NetworkReadRepository),
				this.container.get(NetworkWriteRepository),
				this.container.get(CrawlerService),
				this.container.get(HomeDomainUpdater),
				this.container.get(TomlService),
				this.container.get<GeoDataService>('GeoDataService'),
				this.container.get(FullValidatorUpdater),
				this.container.get<JSONArchiver>('JSONArchiver'),
				this.container.get<HeartBeater>('HeartBeater'),
				this.container.get(Notify),
				this.container.get<ExceptionLogger>('ExceptionLogger'),
				this.container.get<Logger>('Logger')
			);
		});
		this.container.bind(HttpQueue).toSelf();
	}
}
