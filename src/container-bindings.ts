import { AsyncContainerModule, ContainerModule } from 'inversify';
import {
	Connection,
	createConnection,
	getCustomRepository,
	getRepository,
	Repository
} from 'typeorm';
import { NodeMeasurementV2Repository } from './repositories/NodeMeasurementV2Repository';
import { CrawlV2Repository } from './repositories/CrawlV2Repository';
import { NetworkMeasurementDayRepository } from './repositories/NetworkMeasurementDayRepository';
import { NodeMeasurementDayV2Repository } from './repositories/NodeMeasurementDayV2Repository';
import NodeSnapShotRepository from './repositories/NodeSnapShotRepository';
import { OrganizationMeasurementDayRepository } from './repositories/OrganizationMeasurementDayRepository';
import { OrganizationMeasurementRepository } from './repositories/OrganizationMeasurementRepository';
import OrganizationSnapShotRepository from './repositories/OrganizationSnapShotRepository';
import OrganizationSnapShotter from './services/SnapShotting/OrganizationSnapShotter';
import NodeSnapShotter from './services/SnapShotting/NodeSnapShotter';
import NodeSnapShotArchiver from './services/NodeSnapShotArchiver';
import { CrawlResultProcessor } from './services/CrawlResultProcessor';
import CrawlV2Service from './services/CrawlV2Service';
import MeasurementsRollupService from './services/MeasurementsRollupService';
import NodeSnapShotFactory from './factory/NodeSnapShotFactory';
import OrganizationSnapShotFactory from './factory/OrganizationSnapShotFactory';
import NodePublicKeyStorage, {
	NodePublicKeyStorageRepository
} from './entities/NodePublicKeyStorage';
import OrganizationIdStorage, {
	OrganizationIdStorageRepository
} from './entities/OrganizationIdStorage';
import MeasurementRollup from './entities/MeasurementRollup';
import OrganizationMeasurement from './entities/OrganizationMeasurement';
import NetworkMeasurement from './entities/NetworkMeasurement';
import NodeGeoDataStorage from './entities/NodeGeoDataStorage';
import NodeQuorumSetStorage from './entities/NodeQuorumSetStorage';
import NodeMeasurementService from './services/NodeMeasurementService';
import OrganizationMeasurementService from './services/OrganizationMeasurementService';
import FbasAnalyzerService from './services/FbasAnalyzerService';
import { NetworkMeasurementRepository } from './repositories/NetworkMeasurementRepository';
import { NetworkMeasurementMonthRepository } from './repositories/NetworkMeasurementMonthRepository';
import SnapShotter from './services/SnapShotting/SnapShotter';
import { CrawlerService } from './services/CrawlerService';

export const asyncBindings = new AsyncContainerModule(async (bind) => {
	let connectionName: string | undefined = undefined;
	let connection: Connection;
	if (process.env.NODE_ENV === 'test') {
		connectionName = 'test';
		connection = await createConnection(connectionName);
	} else connection = await createConnection();

	bind<Connection>(Connection)
		.toDynamicValue(() => {
			return connection;
		})
		.inRequestScope();
	bind<NodeMeasurementV2Repository>(NodeMeasurementV2Repository)
		.toDynamicValue(() => {
			return getCustomRepository(NodeMeasurementV2Repository, connectionName);
		})
		.inRequestScope();
	bind<NetworkMeasurementRepository>(NetworkMeasurementRepository)
		.toDynamicValue(() => {
			return getCustomRepository(NetworkMeasurementRepository, connectionName);
		})
		.inRequestScope();
	bind<CrawlV2Repository>(CrawlV2Repository)
		.toDynamicValue(() => {
			return getCustomRepository(CrawlV2Repository, connectionName);
		})
		.inRequestScope();
	bind<NetworkMeasurementDayRepository>(NetworkMeasurementDayRepository)
		.toDynamicValue(() => {
			return getCustomRepository(
				NetworkMeasurementDayRepository,
				connectionName
			);
		})
		.inRequestScope();
	bind<NetworkMeasurementMonthRepository>(NetworkMeasurementMonthRepository)
		.toDynamicValue(() => {
			return getCustomRepository(
				NetworkMeasurementMonthRepository,
				connectionName
			);
		})
		.inRequestScope();
	bind<NodeMeasurementDayV2Repository>(NodeMeasurementDayV2Repository)
		.toDynamicValue(() => {
			return getCustomRepository(
				NodeMeasurementDayV2Repository,
				connectionName
			);
		})
		.inRequestScope();
	bind<OrganizationSnapShotRepository>(OrganizationSnapShotRepository)
		.toDynamicValue(() => {
			return getCustomRepository(
				OrganizationSnapShotRepository,
				connectionName
			);
		})
		.inRequestScope();
	bind<NodeSnapShotRepository>(NodeSnapShotRepository)
		.toDynamicValue(() => {
			return getCustomRepository(NodeSnapShotRepository, connectionName);
		})
		.inRequestScope();
	bind<OrganizationMeasurementDayRepository>(
		OrganizationMeasurementDayRepository
	)
		.toDynamicValue(() => {
			return getCustomRepository(
				OrganizationMeasurementDayRepository,
				connectionName
			);
		})
		.inRequestScope();
	bind<OrganizationMeasurementRepository>(OrganizationMeasurementRepository)
		.toDynamicValue(() => {
			return getCustomRepository(
				OrganizationMeasurementRepository,
				connectionName
			);
		})
		.inRequestScope();
	bind<NodePublicKeyStorageRepository>('NodePublicKeyStorageRepository')
		.toDynamicValue(() => {
			return getRepository(NodePublicKeyStorage, connectionName);
		})
		.inRequestScope();
	bind<OrganizationIdStorageRepository>('OrganizationIdStorageRepository')
		.toDynamicValue(() => {
			return getRepository(OrganizationIdStorage, connectionName);
		})
		.inRequestScope();
	bind<Repository<MeasurementRollup>>('Repository<MeasurementRollup>')
		.toDynamicValue(() => {
			return getRepository(MeasurementRollup, connectionName);
		})
		.inRequestScope();
	bind<Repository<OrganizationMeasurement>>(
		'Repository<OrganizationMeasurement>'
	)
		.toDynamicValue(() => {
			return getRepository(OrganizationMeasurement, connectionName);
		})
		.inRequestScope();
	bind<Repository<NetworkMeasurement>>('Repository<NetworkMeasurement>')
		.toDynamicValue(() => {
			return getRepository(NetworkMeasurement, connectionName);
		})
		.inRequestScope();
	bind<Repository<NodeGeoDataStorage>>('Repository<NodeGeoDataStorage>')
		.toDynamicValue(() => {
			return getRepository(NodeGeoDataStorage, connectionName);
		})
		.inRequestScope();
	bind<Repository<NodeQuorumSetStorage>>('Repository<NodeQuorumSetStorage>')
		.toDynamicValue(() => {
			return getRepository(NodeQuorumSetStorage, connectionName);
		})
		.inRequestScope();
});

export const bindings = new ContainerModule((bind) => {
	bind<SnapShotter>(SnapShotter).toSelf();
	bind<NodeSnapShotter>(NodeSnapShotter).toSelf();
	bind<OrganizationSnapShotter>(OrganizationSnapShotter).toSelf();
	bind<NodeSnapShotArchiver>(NodeSnapShotArchiver).toSelf();
	bind<CrawlResultProcessor>(CrawlResultProcessor).toSelf();
	bind<CrawlV2Service>(CrawlV2Service).toSelf();
	bind<CrawlerService>(CrawlerService).toSelf();
	bind<NodeMeasurementService>(NodeMeasurementService).toSelf();
	bind<OrganizationMeasurementService>(OrganizationMeasurementService).toSelf();
	bind<MeasurementsRollupService>(MeasurementsRollupService).toSelf();
	bind<FbasAnalyzerService>(FbasAnalyzerService).toSelf();
	bind<NodeSnapShotFactory>(NodeSnapShotFactory).toSelf();
	bind<OrganizationSnapShotFactory>(OrganizationSnapShotFactory).toSelf();
});
