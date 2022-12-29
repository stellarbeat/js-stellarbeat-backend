import 'reflect-metadata';
import { Container, decorate, injectable } from 'inversify';
import {
	Connection,
	createConnection,
	getCustomRepository,
	getRepository,
	Repository
} from 'typeorm';
import { Config, getConfigFromEnv } from '../config/Config';
import VersionedOrganization, {
	VersionedOrganizationRepository
} from '../../network/domain/VersionedOrganization';
import OrganizationMeasurement from '../../network/domain/measurement/OrganizationMeasurement';
import NetworkMeasurement from '../../network/domain/measurement/NetworkMeasurement';
import NodeGeoDataLocation from '../../network/domain/NodeGeoDataLocation';
import NodeQuorumSet from '../../network/domain/NodeQuorumSet';
import SnapShotter from '../../network/domain/snapshotting/SnapShotter';
import NodeSnapShotter from '../../network/domain/snapshotting/NodeSnapShotter';
import OrganizationSnapShotter from '../../network/domain/snapshotting/OrganizationSnapShotter';
import NodeSnapShotArchiver from '../../network/domain/snapshotting/NodeSnapShotArchiver';
import { NetworkWriteRepository } from '../../network/infrastructure/repositories/NetworkWriteRepository';
import { NetworkReadRepositoryImplementation } from '../../network/infrastructure/repositories/NetworkReadRepository';
import { CrawlerService } from '../../network/domain/update/CrawlerService';
import FbasAnalyzerService from '../../network/domain/FbasAnalyzerService';
import NodeSnapShotFactory from '../../network/domain/snapshotting/factory/NodeSnapShotFactory';
import OrganizationSnapShotFactory from '../../network/domain/snapshotting/factory/OrganizationSnapShotFactory';
import { HorizonService } from '../../network/domain/update/HorizonService';
import { HomeDomainUpdater } from '../../network/domain/update/HomeDomainUpdater';
import { TomlService } from '../../network/domain/update/TomlService';
import { HistoryService } from '../../network/domain/history/HistoryService';
import { FullValidatorUpdater } from '../../network/domain/update/FullValidatorUpdater';
import {
	DummyJSONArchiver,
	S3Archiver
} from '../../network/infrastructure/services/S3Archiver';
import { HeartBeater } from '../services/HeartBeater';
import {
	ConsoleExceptionLogger,
	ExceptionLogger,
	SentryExceptionLogger
} from '../services/ExceptionLogger';
import { UpdateNetwork } from '../../network/use-cases/update-network/UpdateNetwork';
import { HttpService } from '../services/HttpService';
import { createCrawler } from '@stellarbeat/js-stellar-node-crawler';
import { Logger, PinoLogger } from '../services/PinoLogger';
import { Archiver } from '../../network/domain/archiver/Archiver';
import { TypeOrmSubscriberRepository } from '../../notifications/infrastructure/database/repositories/TypeOrmSubscriberRepository';
import { SubscriberRepository } from '../../notifications/domain/subscription/SubscriberRepository';
import { Notify } from '../../notifications/use-cases/determine-events-and-notify-subscribers/Notify';
import { CORE_TYPES } from './di/di-types';
import { NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { load as loadHistory } from '../../history-scan/infrastructure/di/container';
import { load as loadNetworkUpdate } from '../../network/infrastructure/di/container';
import { load as loadNetworkEventNotifications } from '../../notifications/infrastructure/di/container';
import { AxiosHttpService } from './http/AxiosHttpService';
import { HttpQueue } from '../services/HttpQueue';
import { IpStackGeoDataService } from '../../network/infrastructure/services/IpStackGeoDataService';
import { GeoDataService } from '../../network/domain/update/GeoDataService';
import { DummyHeartBeater } from '../../network/infrastructure/services/DummyHeartBeater';
import { DeadManSnitchHeartBeater } from '../../network/infrastructure/services/DeadManSnitchHeartBeater';
import VersionedNode, {
	VersionedNodeRepository
} from '../../network/domain/VersionedNode';

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
			.bind<string>(CORE_TYPES.networkId)
			.toConstantValue(config.networkId);
		this._container
			.bind<string>(CORE_TYPES.networkName)
			.toConstantValue(config.networkName);

		await this.loadAsync(config, connectionName);
		if (config.enableNotifications) {
			loadNetworkEventNotifications(this.container, config);
		}

		this.load(config);
		loadHistory(this.container, connectionName, config);
		loadNetworkUpdate(this.container, connectionName); //todo: move other services
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
			.bind<SubscriberRepository>('SubscriberRepository')
			.toDynamicValue(() => {
				return getCustomRepository(TypeOrmSubscriberRepository, connectionName);
			})
			.inRequestScope();

		this.container
			.bind<VersionedNodeRepository>('NodePublicKeyStorageRepository')
			.toDynamicValue(() => {
				return getRepository(VersionedNode, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<VersionedOrganizationRepository>('OrganizationIdStorageRepository')
			.toDynamicValue(() => {
				return getRepository(VersionedOrganization, connectionName);
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
			.bind<Repository<NodeGeoDataLocation>>('Repository<NodeGeoDataStorage>')
			.toDynamicValue(() => {
				return getRepository(NodeGeoDataLocation, connectionName);
			})
			.inRequestScope();
		this.container
			.bind<Repository<NodeQuorumSet>>('Repository<NodeQuorumSetStorage>')
			.toDynamicValue(() => {
				return getRepository(NodeQuorumSet, connectionName);
			})
			.inRequestScope();
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
			.bind<NetworkReadRepository>(CORE_TYPES.NetworkReadRepository)
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
		this.container.bind<Archiver>('JSONArchiver').toDynamicValue(() => {
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
				this.container.get<NetworkReadRepository>(
					CORE_TYPES.NetworkReadRepository
				),
				this.container.get(NetworkWriteRepository),
				this.container.get(CrawlerService),
				this.container.get(HomeDomainUpdater),
				this.container.get(TomlService),
				this.container.get<GeoDataService>('GeoDataService'),
				this.container.get(FullValidatorUpdater),
				this.container.get<Archiver>('JSONArchiver'),
				this.container.get<HeartBeater>('HeartBeater'),
				this.container.get(Notify),
				this.container.get<ExceptionLogger>('ExceptionLogger'),
				this.container.get<Logger>('Logger')
			);
		});
		this.container.bind(HttpQueue).toSelf();
	}
}
