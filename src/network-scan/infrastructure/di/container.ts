import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { GetNetwork } from '../../use-cases/get-network/GetNetwork';
import { GetLatestNodeSnapshots } from '../../use-cases/get-latest-node-snapshots/GetLatestNodeSnapshots';
import { GetLatestOrganizationSnapshots } from '../../use-cases/get-latest-organization-snapshots/GetLatestOrganizationSnapshots';
import { GetNodes } from '../../use-cases/get-nodes/GetNodes';
import { GetNode } from '../../use-cases/get-node/GetNode';
import { GetNodeSnapshots } from '../../use-cases/get-node-snapshots/GetNodeSnapshots';
import { GetOrganization } from '../../use-cases/get-organization/GetOrganization';
import { GetOrganizations } from '../../use-cases/get-organizations/GetOrganizations';
import { GetOrganizationSnapshots } from '../../use-cases/get-organization-snapshots/GetOrganizationSnapshots';
import { GetMeasurements } from '../../use-cases/get-measurements/GetMeasurements';
import { GetMeasurementsFactory } from '../../use-cases/get-measurements/GetMeasurementsFactory';
import { getCustomRepository, getRepository, Repository } from 'typeorm';
import { DatabaseHistoryArchiveScanService } from '../services/DatabaseHistoryArchiveScanService';
import { HistoryArchiveScanService } from '../../domain/history/HistoryArchiveScanService';
import { NETWORK_TYPES } from './di-types';
import { NodeMeasurementRepository } from '../../domain/measurement/NodeMeasurementRepository';
import { NetworkRepository } from '../../domain/network/NetworkRepository';
import { TypeOrmOrganizationMeasurementRepository } from '../database/repositories/TypeOrmOrganizationMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../domain/measurement/OrganizationMeasurementRepository';
import { TypeOrmNodeMeasurementRepository } from '../database/repositories/TypeOrmNodeMeasurementRepository';
import { NetworkMeasurementRepository } from '../../domain/measurement/NetworkMeasurementRepository';
import { TypeOrmNetworkMeasurementRepository } from '../database/repositories/TypeOrmNetworkMeasurementRepository';
import { TypeOrmVersionedNetworkRepository } from '../database/repositories/TypeOrmVersionedNetworkRepository';
import DatabaseMeasurementsRollupService from '../services/DatabaseMeasurementsRollupService';
import { MeasurementsRollupService } from '../../domain/measurement-aggregation/MeasurementsRollupService';
import MeasurementRollup from '../database/entities/MeasurementRollup';
import TypeOrmNodeSnapShotRepository from '../database/repositories/TypeOrmNodeSnapShotRepository';
import { NodeSnapShotRepository } from '../../domain/snapshotting/NodeSnapShotRepository';
import { OrganizationSnapShotRepository } from '../../domain/snapshotting/OrganizationSnapShotRepository';
import TypeOrmOrganizationSnapShotRepository from '../database/repositories/TypeOrmOrganizationSnapShotRepository';
import { TypeOrmNodeMeasurementDayRepository } from '../database/repositories/TypeOrmNodeMeasurementDayRepository';
import { NodeMeasurementDayRepository } from '../../domain/measurement-aggregation/NodeMeasurementDayRepository';
import { OrganizationMeasurementDayRepository } from '../../domain/measurement-aggregation/OrganizationMeasurementDayRepository';
import { TypeOrmOrganizationMeasurementDayRepository } from '../database/repositories/TypeOrmOrganizationMeasurementDayRepository';
import { TypeOrmNetworkUpdateRepository } from '../database/repositories/TypeOrmNetworkUpdateRepository';
import { NetworkUpdateRepository } from '../../domain/NetworkUpdateRepository';
import { NetworkMeasurementDayRepository } from '../../domain/measurement-aggregation/NetworkMeasurementDayRepository';
import { TypeOrmNetworkMeasurementDayRepository } from '../database/repositories/TypeOrmNetworkMeasurementDayRepository';
import { NetworkMeasurementMonthRepository } from '../../domain/measurement-aggregation/NetworkMeasurementMonthRepository';
import { TypeOrmNetworkMeasurementMonthRepository } from '../database/repositories/TypeOrmNetworkMeasurementMonthRepository';
import VersionedNode, {
	VersionedNodeRepository
} from '../../domain/VersionedNode';
import { VersionedOrganizationRepository } from '../../domain/VersionedOrganizationRepository';
import { TypeOrmVersionedOrganizationRepository } from '../database/repositories/TypeOrmVersionedOrganizationRepository';
import { GetMeasurementAggregations } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregations';
import { MeasurementAggregationRepositoryFactory } from '../../domain/measurement-aggregation/MeasurementAggregationRepositoryFactory';
import { NetworkWriteRepository } from '../repositories/NetworkWriteRepository';
import { NetworkReadRepositoryImplementation } from '../repositories/NetworkReadRepository';
import { NetworkReadRepository } from '../../services/NetworkReadRepository';
import { Config } from '../../../core/config/Config';
import { NetworkService } from '../../services/NetworkService';
import { HomeDomainUpdater } from '../../domain/scan/HomeDomainUpdater';
import { TomlService } from '../../domain/scan/TomlService';
import { GeoDataService } from '../../domain/scan/GeoDataService';
import { FullValidatorUpdater } from '../../domain/scan/FullValidatorUpdater';
import { Archiver } from '../../domain/archiver/Archiver';
import { HeartBeater } from '../../../core/services/HeartBeater';
import { Notify } from '../../../notifications/use-cases/determine-events-and-notify-subscribers/Notify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { Logger } from '../../../core/services/PinoLogger';
import { HistoryService } from '../../domain/history/HistoryService';
import { IpStackGeoDataService } from '../services/IpStackGeoDataService';
import { HttpService } from '../../../core/services/HttpService';
import { NetworkScanner } from '../../domain/scan/NetworkScanner';
import SnapShotter from '../../domain/snapshotting/SnapShotter';
import NodeSnapShotter from '../../domain/snapshotting/NodeSnapShotter';
import OrganizationSnapShotter from '../../domain/snapshotting/OrganizationSnapShotter';
import NodeSnapShotArchiver from '../../domain/snapshotting/NodeSnapShotArchiver';
import { CrawlerService } from '../../domain/scan/CrawlerService';
import { createCrawler } from '@stellarbeat/js-stellar-node-crawler';
import FbasAnalyzerService from '../../domain/FbasAnalyzerService';
import NodeSnapShotFactory from '../../domain/snapshotting/factory/NodeSnapShotFactory';
import OrganizationSnapShotFactory from '../../domain/snapshotting/factory/OrganizationSnapShotFactory';
import { HorizonService } from '../../domain/scan/HorizonService';
import OrganizationMeasurement from '../../domain/measurement/OrganizationMeasurement';
import NetworkMeasurement from '../../domain/measurement/NetworkMeasurement';
import NodeGeoDataLocation from '../../domain/NodeGeoDataLocation';
import NodeQuorumSet from '../../domain/NodeQuorumSet';
import { ScanNetwork } from '../../use-cases/scan-network/ScanNetwork';
import { UpdateNetwork } from '../../use-cases/update-network/UpdateNetwork';

export function load(
	container: Container,
	connectionName: string | undefined,
	config: Config
) {
	loadDomain(container, connectionName, config);
	loadUseCases(container, config);
	loadServices(container);
}

function loadRollup(container: Container, connectionName: string | undefined) {
	container
		.bind<Repository<MeasurementRollup>>('Repository<MeasurementRollup>')
		.toDynamicValue(() => {
			return getRepository(MeasurementRollup, connectionName);
		})
		.inRequestScope();
	container
		.bind<MeasurementsRollupService>(NETWORK_TYPES.MeasurementsRollupService)
		.to(DatabaseMeasurementsRollupService);

	container
		.bind<NodeMeasurementDayRepository>(
			NETWORK_TYPES.NodeMeasurementDayRepository
		)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmNodeMeasurementDayRepository,
				connectionName
			);
		})
		.inRequestScope();
	container
		.bind<OrganizationMeasurementDayRepository>(
			NETWORK_TYPES.OrganizationMeasurementDayRepository
		)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmOrganizationMeasurementDayRepository,
				connectionName
			);
		})
		.inRequestScope();

	container
		.bind<NetworkMeasurementDayRepository>(
			NETWORK_TYPES.NetworkMeasurementDayRepository
		)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmNetworkMeasurementDayRepository,
				connectionName
			);
		})
		.inRequestScope();
	container
		.bind<NetworkMeasurementMonthRepository>(
			NETWORK_TYPES.NetworkMeasurementMonthRepository
		)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmNetworkMeasurementMonthRepository,
				connectionName
			);
		})
		.inRequestScope();
	container.bind(MeasurementAggregationRepositoryFactory).toSelf();
}

function loadServices(container: Container) {
	container.bind(NetworkService).toSelf();
}

function loadDomain(
	container: Container,
	connectionName: string | undefined,
	config: Config
) {
	loadSnapshotting(container, connectionName);
	loadRollup(container, connectionName);
	container
		.bind<Repository<OrganizationMeasurement>>(
			'Repository<OrganizationMeasurement>'
		)
		.toDynamicValue(() => {
			return getRepository(OrganizationMeasurement, connectionName);
		})
		.inRequestScope();
	container
		.bind<Repository<NetworkMeasurement>>('Repository<NetworkMeasurement>')
		.toDynamicValue(() => {
			return getRepository(NetworkMeasurement, connectionName);
		})
		.inRequestScope();
	container
		.bind<Repository<NodeGeoDataLocation>>('Repository<NodeGeoDataStorage>')
		.toDynamicValue(() => {
			return getRepository(NodeGeoDataLocation, connectionName);
		})
		.inRequestScope();
	container
		.bind<Repository<NodeQuorumSet>>('Repository<NodeQuorumSetStorage>')
		.toDynamicValue(() => {
			return getRepository(NodeQuorumSet, connectionName);
		})
		.inRequestScope();
	container.bind<CrawlerService>(CrawlerService).toDynamicValue(() => {
		const crawler = createCrawler(
			config.crawlerConfig,
			container.get<Logger>('Logger').getRawLogger()
		); //todo:dependencies should accept generic logger interface
		return new CrawlerService(crawler, container.get<Logger>('Logger'));
	});

	container.bind<FbasAnalyzerService>(FbasAnalyzerService).toSelf();
	container.bind<HorizonService>(HorizonService).toDynamicValue(() => {
		return new HorizonService(
			container.get<HttpService>('HttpService'),
			config.horizonUrl
		);
	});
	container
		.bind<OrganizationMeasurementRepository>(
			NETWORK_TYPES.OrganizationMeasurementRepository
		)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmOrganizationMeasurementRepository,
				connectionName
			);
		})
		.inRequestScope();

	container
		.bind<NodeMeasurementRepository>(NETWORK_TYPES.NodeMeasurementRepository)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmNodeMeasurementRepository,
				connectionName
			);
		})
		.inRequestScope();

	container
		.bind<NetworkMeasurementRepository>(
			NETWORK_TYPES.NetworkMeasurementRepository
		)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmNetworkMeasurementRepository,
				connectionName
			);
		})
		.inRequestScope();
	container
		.bind<HistoryArchiveScanService>(NETWORK_TYPES.HistoryArchiveScanService)
		.to(DatabaseHistoryArchiveScanService);
	container
		.bind<NetworkRepository>(NETWORK_TYPES.VersionedNetworkRepository)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmVersionedNetworkRepository,
				connectionName
			);
		});
	container
		.bind<NetworkUpdateRepository>(NETWORK_TYPES.NetworkUpdateRepository)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmNetworkUpdateRepository,
				connectionName
			);
		})
		.inRequestScope();

	container.bind<NetworkWriteRepository>(NetworkWriteRepository).toSelf();
	container
		.bind<NetworkReadRepository>(NETWORK_TYPES.NetworkReadRepository)
		.to(NetworkReadRepositoryImplementation)
		.inSingletonScope(); //make more efficient use of the cache
	container.bind<HomeDomainUpdater>(HomeDomainUpdater).toSelf();
	container.bind<TomlService>(TomlService).toSelf();
	container.bind<HistoryService>(HistoryService).toSelf();
	container.bind<GeoDataService>('GeoDataService').toDynamicValue(() => {
		return new IpStackGeoDataService(
			container.get<Logger>('Logger'),
			container.get<HttpService>('HttpService'),
			config.ipStackAccessKey
		);
	});
	container.bind<FullValidatorUpdater>(FullValidatorUpdater).toSelf();
	container.bind(NetworkScanner).toSelf();
}

function loadUseCases(container: Container, config: Config) {
	container.bind(GetNetwork).toSelf();
	container.bind(GetLatestNodeSnapshots).toSelf();
	container.bind(GetLatestOrganizationSnapshots).toSelf();
	container.bind(GetNodes).toSelf();
	container.bind(GetNode).toSelf();
	container.bind(GetNodeSnapshots).toSelf();
	container.bind(GetOrganization).toSelf();
	container.bind(GetOrganizations).toSelf();
	container.bind(GetOrganizationSnapshots).toSelf();
	container.bind(GetMeasurements).toSelf();
	container.bind(GetMeasurementsFactory).toSelf();
	container.bind(GetMeasurementAggregations).toSelf();
	container.bind(UpdateNetwork).toSelf();
	container.bind<ScanNetwork>(ScanNetwork).toDynamicValue(() => {
		return new ScanNetwork(
			config.networkConfig,
			container.get(UpdateNetwork),
			container.get<NetworkRepository>(
				NETWORK_TYPES.VersionedNetworkRepository
			),
			container.get<NetworkReadRepository>(NETWORK_TYPES.NetworkReadRepository),
			container.get(NetworkWriteRepository),
			container.get(NetworkScanner),
			container.get<Archiver>('JSONArchiver'),
			container.get<HeartBeater>('HeartBeater'),
			container.get(Notify),
			container.get<ExceptionLogger>('ExceptionLogger'),
			container.get<Logger>('Logger')
		);
	});
}

function loadSnapshotting(
	container: Container,
	connectionName: string | undefined
) {
	container
		.bind<VersionedNodeRepository>(NETWORK_TYPES.VersionedNodeRepository)
		.toDynamicValue(() => {
			return getRepository(VersionedNode, connectionName);
		})
		.inRequestScope();
	container
		.bind<VersionedOrganizationRepository>(
			NETWORK_TYPES.VersionedOrganizationRepository
		)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmVersionedOrganizationRepository,
				connectionName
			);
		})
		.inRequestScope();

	container
		.bind<NodeSnapShotRepository>(NETWORK_TYPES.NodeSnapshotRepository)
		.toDynamicValue(() => {
			return getCustomRepository(TypeOrmNodeSnapShotRepository, connectionName);
		})
		.inRequestScope();
	container
		.bind<OrganizationSnapShotRepository>(
			NETWORK_TYPES.OrganizationSnapshotRepository
		)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmOrganizationSnapShotRepository,
				connectionName
			);
		})
		.inRequestScope();
	container.bind<SnapShotter>(SnapShotter).toSelf();
	container.bind<NodeSnapShotter>(NodeSnapShotter).toSelf();
	container.bind<OrganizationSnapShotter>(OrganizationSnapShotter).toSelf();
	container.bind<NodeSnapShotArchiver>(NodeSnapShotArchiver).toSelf();

	container.bind<NodeSnapShotFactory>(NodeSnapShotFactory).toSelf();
	container
		.bind<OrganizationSnapShotFactory>(OrganizationSnapShotFactory)
		.toSelf();
}
