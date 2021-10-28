import { Container, decorate, injectable } from 'inversify';
import {
	Connection,
	createConnection,
	getCustomRepository,
	getRepository,
	Repository
} from 'typeorm';
import { Config } from '../../config/Config';
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
import NetworkReadRepository from '../../network/repositories/NetworkReadRepository';
import { CrawlerService } from '../../network/services/CrawlerService';
import NodeMeasurementService from '../../network/infrastructure/database/repositories/NodeMeasurementService';
import OrganizationMeasurementService from '../../network/infrastructure/database/repositories/OrganizationMeasurementService';
import MeasurementsRollupService from '../../network/infrastructure/database/measurements-rollup/MeasurementsRollupService';
import FbasAnalyzerService from '../../network/services/FbasAnalyzerService';
import NodeSnapShotFactory from '../../network/infrastructure/database/snapshotting/factory/NodeSnapShotFactory';
import OrganizationSnapShotFactory from '../../network/infrastructure/database/snapshotting/factory/OrganizationSnapShotFactory';
import { HorizonService } from '../../network/services/HorizonService';
import { HomeDomainUpdater } from '../../network/services/HomeDomainUpdater';
import { TomlService } from '../../network/services/TomlService';
import { HistoryService } from '../../network/services/HistoryService';
import {
	GeoDataService,
	IpStackGeoDataService
} from '../../network/services/IpStackGeoDataService';
import { FullValidatorDetector } from '../../network/services/FullValidatorDetector';
import {
	DummyJSONArchiver,
	S3Archiver
} from '../../network/services/archiver/S3Archiver';
import {
	DeadManSnitchHeartBeater,
	DummyHeartBeater,
	HeartBeater
} from '../../network/services/DeadManSnitchHeartBeater';
import { APICacheClearer } from '../../network/services/APICacheClearer';
import {
	ConsoleExceptionLogger,
	ExceptionLogger,
	SentryExceptionLogger
} from '../services/ExceptionLogger';
import { UpdateNetwork } from '../../network/useCases/updateNetwork/UpdateNetwork';
import { AxiosHttpService, HttpService } from '../services/HttpService';
import { createCrawler } from '@stellarbeat/js-stellar-node-crawler';
import { Logger, PinoLogger } from '../services/PinoLogger';
import { JSONArchiver } from '../../network/services/archiver/JSONArchiver';
import { TypeOrmEventRepository } from '../../notifications/infrastructure/database/repositories/TypeOrmEventRepository';
import { TypeOrmContactRepository } from '../../notifications/infrastructure/database/repositories/TypeOrmContactRepository';
import { ContactRepository } from '../../notifications/domain/contact/ContactRepository';
import { EventRepository } from '../../notifications/domain/event/EventRepository';

export default class Kernel {
	protected _container?: Container;

	constructor() {
		decorate(injectable(), Repository);
		decorate(injectable(), Connection);
	}

	async initializeContainer(config: Config): Promise<void> {
		this._container = new Container();
		await this.loadAsync(config);
		this.load(config);
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

	async loadAsync(config: Config) {
		let connectionName: string | undefined = undefined;
		let connection: Connection;
		if (config.nodeEnv === 'test') {
			connectionName = 'test';
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
			.bind<ContactRepository>('ContactRepository')
			.toDynamicValue(() => {
				return getCustomRepository(TypeOrmContactRepository, connectionName);
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
		this.container.bind<HttpService>('HttpService').toDynamicValue(() => {
			return new AxiosHttpService(config.userAgent);
		});
		this.container.bind<SnapShotter>(SnapShotter).toSelf();
		this.container.bind<NodeSnapShotter>(NodeSnapShotter).toSelf();
		this.container
			.bind<OrganizationSnapShotter>(OrganizationSnapShotter)
			.toSelf();
		this.container.bind<NodeSnapShotArchiver>(NodeSnapShotArchiver).toSelf();
		this.container
			.bind<NetworkWriteRepository>(NetworkWriteRepository)
			.toSelf();
		this.container.bind<NetworkReadRepository>(NetworkReadRepository).toSelf();
		this.container.bind<CrawlerService>(CrawlerService).toDynamicValue(() => {
			const crawler = createCrawler(config.crawlerConfig); //todo logger
			return new CrawlerService(
				config.topTierFallback,
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

		this.container.bind<FullValidatorDetector>(FullValidatorDetector).toSelf();
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

		this.container.bind<APICacheClearer>(APICacheClearer).toDynamicValue(() => {
			return new APICacheClearer(
				this.container.get<HttpService>('HttpService'),
				config.apiCacheClearUrl
			);
		});

		this.container
			.bind<ExceptionLogger>('ExceptionLogger')
			.toDynamicValue(() => {
				if (config.enableSentry && config.sentryDSN)
					return new SentryExceptionLogger(config.sentryDSN);
				else return new ConsoleExceptionLogger();
			});
		this.container.bind<UpdateNetwork>(UpdateNetwork).toDynamicValue(() => {
			return new UpdateNetwork(
				config.loop,
				this.container.get(NetworkReadRepository),
				this.container.get(NetworkWriteRepository),
				this.container.get(CrawlerService),
				this.container.get(HomeDomainUpdater),
				this.container.get(TomlService),
				this.container.get<GeoDataService>('GeoDataService'),
				this.container.get(FullValidatorDetector),
				this.container.get<JSONArchiver>('JSONArchiver'),
				this.container.get(APICacheClearer),
				this.container.get<HeartBeater>('HeartBeater'),
				this.container.get<ExceptionLogger>('ExceptionLogger'),
				this.container.get<Logger>('Logger')
			);
		});
		this.container.bind<Logger>('Logger').to(PinoLogger);
	}
}
