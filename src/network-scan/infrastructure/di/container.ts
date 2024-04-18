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
import { DataSource, Repository } from 'typeorm';
import { DatabaseHistoryArchiveScanService } from '../services/DatabaseHistoryArchiveScanService';
import { HistoryArchiveScanService } from '../../domain/node/scan/history/HistoryArchiveScanService';
import { NETWORK_TYPES } from './di-types';
import { NodeMeasurementRepository } from '../../domain/node/NodeMeasurementRepository';
import { NetworkRepository } from '../../domain/network/NetworkRepository';
import { TypeOrmOrganizationMeasurementRepository } from '../database/repositories/TypeOrmOrganizationMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../domain/organization/OrganizationMeasurementRepository';
import { TypeOrmNodeMeasurementRepository } from '../database/repositories/TypeOrmNodeMeasurementRepository';
import { NetworkMeasurementRepository } from '../../domain/network/NetworkMeasurementRepository';
import { TypeOrmNetworkMeasurementRepository } from '../database/repositories/TypeOrmNetworkMeasurementRepository';
import { TypeOrmNetworkRepository } from '../database/repositories/TypeOrmNetworkRepository';
import DatabaseMeasurementsRollupService from '../services/DatabaseMeasurementsRollupService';
import { MeasurementsRollupService } from '../../domain/measurement-aggregation/MeasurementsRollupService';
import MeasurementRollup from '../database/entities/MeasurementRollup';
import TypeOrmNodeSnapShotRepository from '../database/repositories/TypeOrmNodeSnapShotRepository';
import { NodeSnapShotRepository } from '../../domain/node/NodeSnapShotRepository';
import { TypeOrmNodeMeasurementDayRepository } from '../database/repositories/TypeOrmNodeMeasurementDayRepository';
import { NodeMeasurementDayRepository } from '../../domain/node/NodeMeasurementDayRepository';
import { OrganizationMeasurementDayRepository } from '../../domain/organization/OrganizationMeasurementDayRepository';
import { TypeOrmOrganizationMeasurementDayRepository } from '../database/repositories/TypeOrmOrganizationMeasurementDayRepository';
import { TypeOrmNetworkScanRepository } from '../database/repositories/TypeOrmNetworkScanRepository';
import { NetworkScanRepository } from '../../domain/network/scan/NetworkScanRepository';
import { NetworkMeasurementDayRepository } from '../../domain/network/NetworkMeasurementDayRepository';
import { TypeOrmNetworkMeasurementDayRepository } from '../database/repositories/TypeOrmNetworkMeasurementDayRepository';
import { NetworkMeasurementMonthRepository } from '../../domain/network/NetworkMeasurementMonthRepository';
import { TypeOrmNetworkMeasurementMonthRepository } from '../database/repositories/TypeOrmNetworkMeasurementMonthRepository';
import { OrganizationRepository } from '../../domain/organization/OrganizationRepository';
import { TypeOrmOrganizationRepository } from '../database/repositories/TypeOrmOrganizationRepository';
import { GetMeasurementAggregations } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregations';
import { MeasurementAggregationRepositoryFactory } from '../../domain/measurement-aggregation/MeasurementAggregationRepositoryFactory';
import { Config, NetworkConfig } from '../../../core/config/Config';
import { NetworkDTOService } from '../../services/NetworkDTOService';
import { HomeDomainFetcher } from '../../domain/node/scan/HomeDomainFetcher';
import { TomlService } from '../../domain/network/scan/TomlService';
import { GeoDataService } from '../../domain/node/scan/GeoDataService';
import { HistoryArchiveStatusFinder } from '../../domain/node/scan/HistoryArchiveStatusFinder';
import { Archiver } from '../../domain/network/scan/archiver/Archiver';
import { Logger } from '../../../core/services/PinoLogger';
import { HistoryService } from '../../domain/node/scan/history/HistoryService';
import { IpStackGeoDataService } from '../services/IpStackGeoDataService';
import { HttpService } from '../../../core/services/HttpService';
import { NetworkScanner } from '../../domain/network/scan/NetworkScanner';
import { CrawlerService } from '../../domain/node/scan/node-crawl/CrawlerService';
import {
	createCrawler,
	createCrawlFactory
} from '@stellarbeat/js-stellar-node-crawler';
import FbasAnalyzerFacade from '../../domain/network/scan/fbas-analysis/FbasAnalyzerFacade';
import { HorizonService } from '../../domain/network/scan/HorizonService';
import OrganizationMeasurement from '../../domain/organization/OrganizationMeasurement';
import NetworkMeasurement from '../../domain/network/NetworkMeasurement';
import NodeGeoDataLocation from '../../domain/node/NodeGeoDataLocation';
import NodeQuorumSet from '../../domain/node/NodeQuorumSet';
import { ScanNetwork } from '../../use-cases/scan-network/ScanNetwork';
import { UpdateNetwork } from '../../use-cases/update-network/UpdateNetwork';
import { NodeRepository } from '../../domain/node/NodeRepository';
import { TypeOrmNodeRepository } from '../database/repositories/TypeOrmNodeRepository';
import { Network } from '../../domain/network/Network';
import { NodeScanner } from '../../domain/node/scan/NodeScanner';
import { OrganizationScanner } from '../../domain/organization/scan/OrganizationScanner';
import Node from '../../domain/node/Node';
import NodeSnapShot from '../../domain/node/NodeSnapShot';
import { NodeScannerIndexerStep } from '../../domain/node/scan/NodeScannerIndexerStep';
import { NodeScannerHistoryArchiveStep } from '../../domain/node/scan/NodeScannerHistoryArchiveStep';
import { NodeScannerHomeDomainStep } from '../../domain/node/scan/NodeScannerHomeDomainStep';
import { NodeScannerGeoStep } from '../../domain/node/scan/NodeScannerGeoStep';
import { NodeScannerCrawlStep } from '../../domain/node/scan/NodeScannerCrawlStep';
import { NodeScannerTomlStep } from '../../domain/node/scan/NodeScannerTomlStep';
import { NodeTomlFetcher } from '../../domain/node/scan/NodeTomlFetcher';
import Organization from '../../domain/organization/Organization';
import { OrganizationTomlFetcher } from '../../domain/organization/scan/OrganizationTomlFetcher';
import { Scanner } from '../../domain/Scanner';
import { OrganizationSnapShotRepository } from '../../domain/organization/OrganizationSnapShotRepository';
import TypeOrmOrganizationSnapShotRepository from '../database/repositories/TypeOrmOrganizationSnapShotRepository';
import OrganizationSnapShot from '../../domain/organization/OrganizationSnapShot';
import NetworkScan from '../../domain/network/scan/NetworkScan';
import { ScanRepository } from '../../domain/ScanRepository';
import { NodeDTOService } from '../../services/NodeDTOService';
import { OrganizationDTOService } from '../../services/OrganizationDTOService';
import { ScanNetworkLooped } from '../../use-cases/scan-network-looped/ScanNetworkLooped';
import { NullArchiver, S3Archiver } from '../services/S3Archiver';
import FbasAnalyzerService from '../../domain/network/scan/fbas-analysis/FbasAnalyzerService';
import { FbasMergedByAnalyzer } from '../../domain/network/scan/fbas-analysis/FbasMergedByAnalyzer';
import { NodesInTransitiveNetworkQuorumSetFinder } from '../../domain/network/scan/NodesInTransitiveNetworkQuorumSetFinder';
import { NodeV1DTOMapper } from '../../mappers/NodeV1DTOMapper';
import { OrganizationV1DTOMapper } from '../../mappers/OrganizationV1DTOMapper';
import { NetworkV1DTOMapper } from '../../mappers/NetworkV1DTOMapper';
import { ValidatorDemoter } from '../../domain/node/archival/ValidatorDemoter';
import { InactiveNodesArchiver } from '../../domain/node/archival/InactiveNodesArchiver';
import { NodeScannerArchivalStep } from '../../domain/node/scan/NodeScannerArchivalStep';
import NodeMeasurement from '../../domain/node/NodeMeasurement';
import NetworkMeasurementMonth from '../../domain/network/NetworkMeasurementMonth';
import OrganizationMeasurementDay from '../../domain/organization/OrganizationMeasurementDay';
import NodeMeasurementDay from '../../domain/node/NodeMeasurementDay';
import NetworkMeasurementDay from '../../domain/network/NetworkMeasurementDay';
import { CachedNetworkDTOService } from '../../services/CachedNetworkDTOService';

export function load(container: Container, config: Config) {
	container
		.bind<string>(NETWORK_TYPES.networkId)
		.toConstantValue(config.networkConfig.networkId);
	container
		.bind<string>(NETWORK_TYPES.networkName)
		.toConstantValue(config.networkConfig.networkName);
	container
		.bind<NetworkConfig>(NETWORK_TYPES.NetworkConfig)
		.toConstantValue(config.networkConfig);

	loadDomain(container, config);
	loadUseCases(container);
	loadServices(container, config);
	loadMappers(container);
}

function loadRollup(container: Container) {
	const dataSource = container.get<DataSource>(DataSource);
	container
		.bind<Repository<MeasurementRollup>>('Repository<MeasurementRollup>')
		.toDynamicValue(() => {
			return dataSource.getRepository(MeasurementRollup);
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
			return new TypeOrmNodeMeasurementDayRepository(
				dataSource.getRepository(NodeMeasurementDay)
			);
		})
		.inRequestScope();
	container
		.bind<OrganizationMeasurementDayRepository>(
			NETWORK_TYPES.OrganizationMeasurementDayRepository
		)
		.toDynamicValue(() => {
			return new TypeOrmOrganizationMeasurementDayRepository(
				dataSource.getRepository(OrganizationMeasurementDay)
			);
		})
		.inRequestScope();

	container
		.bind<NetworkMeasurementDayRepository>(
			NETWORK_TYPES.NetworkMeasurementDayRepository
		)
		.toDynamicValue(() => {
			return new TypeOrmNetworkMeasurementDayRepository(
				dataSource.getRepository(NetworkMeasurementDay)
			);
		})
		.inRequestScope();
	container
		.bind<NetworkMeasurementMonthRepository>(
			NETWORK_TYPES.NetworkMeasurementMonthRepository
		)
		.toDynamicValue(() => {
			return new TypeOrmNetworkMeasurementMonthRepository(
				dataSource.getRepository(NetworkMeasurementMonth)
			);
		})
		.inRequestScope();
	container.bind(MeasurementAggregationRepositoryFactory).toSelf();
}

function loadServices(container: Container, config: Config) {
	container.bind(NetworkDTOService).toSelf();
	container.bind(NodeDTOService).toSelf();
	container.bind(OrganizationDTOService).toSelf();
	container.bind<Archiver>('JSONArchiver').toDynamicValue(() => {
		if (
			config.enableS3Backup &&
			config.s3Secret &&
			config.s3AccessKeyId &&
			config.s3BucketName &&
			config.s3Region
		)
			return new S3Archiver(
				config.s3AccessKeyId,
				config.s3Secret,
				config.s3BucketName,
				config.s3Region,
				config.nodeEnv,
				container.get(NetworkDTOService)
			);
		return new NullArchiver(container.get<Logger>('Logger'));
	});
	container.bind(CachedNetworkDTOService).toSelf();
}

function loadMappers(container: Container) {
	container.bind(NodeV1DTOMapper).toSelf();
	container.bind(OrganizationV1DTOMapper).toSelf();
	container.bind(NetworkV1DTOMapper).toSelf();
}

function loadDomain(container: Container, config: Config) {
	loadNodeScan(container);
	loadOrganizationScan(container);
	container.bind(Scanner).toSelf();
	container.bind(ScanRepository).toSelf();
	loadSnapshotting(container);
	loadRollup(container);
	const dataSource = container.get<DataSource>(DataSource);
	container
		.bind<Repository<OrganizationMeasurement>>(
			'Repository<OrganizationMeasurement>'
		)
		.toDynamicValue(() => {
			return dataSource.getRepository(OrganizationMeasurement);
		})
		.inRequestScope();
	container
		.bind<Repository<NetworkMeasurement>>('Repository<NetworkMeasurement>')
		.toDynamicValue(() => {
			return dataSource.getRepository(NetworkMeasurement);
		})
		.inRequestScope();
	container
		.bind<Repository<NodeGeoDataLocation>>('Repository<NodeGeoDataStorage>')
		.toDynamicValue(() => {
			return dataSource.getRepository(NodeGeoDataLocation);
		})
		.inRequestScope();
	container
		.bind<Repository<NodeQuorumSet>>('Repository<NodeQuorumSetStorage>')
		.toDynamicValue(() => {
			return dataSource.getRepository(NodeQuorumSet);
		})
		.inRequestScope();
	container.bind<CrawlerService>(CrawlerService).toDynamicValue(() => {
		const crawler = createCrawler(
			config.crawlerConfig,
			container.get<Logger>('Logger').getRawLogger()
		); //todo:dependencies should accept generic logger interface
		const crawlFactory = createCrawlFactory(
			config.crawlerConfig,
			container.get<Logger>('Logger').getRawLogger()
		);
		return new CrawlerService(crawler, crawlFactory);
	});

	container.bind<FbasAnalyzerService>(FbasAnalyzerService).toSelf();
	container.bind(FbasAnalyzerFacade).toSelf();
	container.bind(FbasMergedByAnalyzer).toSelf();
	container.bind(NodesInTransitiveNetworkQuorumSetFinder).toSelf();
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
			return new TypeOrmOrganizationMeasurementRepository(
				dataSource.getRepository(OrganizationMeasurement)
			);
		})
		.inRequestScope();

	container
		.bind<NodeMeasurementRepository>(NETWORK_TYPES.NodeMeasurementRepository)
		.toDynamicValue(() => {
			return new TypeOrmNodeMeasurementRepository(
				dataSource.getRepository(NodeMeasurement)
			);
		})
		.inRequestScope();

	container
		.bind<NetworkMeasurementRepository>(
			NETWORK_TYPES.NetworkMeasurementRepository
		)
		.toDynamicValue(() => {
			return new TypeOrmNetworkMeasurementRepository(
				dataSource.getRepository(NetworkMeasurement)
			);
		})
		.inRequestScope();
	container
		.bind<HistoryArchiveScanService>(NETWORK_TYPES.HistoryArchiveScanService)
		.to(DatabaseHistoryArchiveScanService);
	container
		.bind<NetworkRepository>(NETWORK_TYPES.NetworkRepository)
		.toDynamicValue(() => {
			return new TypeOrmNetworkRepository(dataSource.getRepository(Network));
		});
	container
		.bind<NetworkScanRepository>(NETWORK_TYPES.NetworkScanRepository)
		.toDynamicValue(() => {
			return new TypeOrmNetworkScanRepository(
				dataSource.getRepository(NetworkScan)
			);
		})
		.inRequestScope();

	container.bind<HomeDomainFetcher>(HomeDomainFetcher).toSelf();
	container.bind<TomlService>(TomlService).toSelf().inSingletonScope();
	container.bind<HistoryService>(HistoryService).toSelf();
	container.bind<GeoDataService>('GeoDataService').toDynamicValue(() => {
		return new IpStackGeoDataService(
			container.get<Logger>('Logger'),
			container.get<HttpService>('HttpService'),
			config.ipStackAccessKey
		);
	});
	container
		.bind<HistoryArchiveStatusFinder>(HistoryArchiveStatusFinder)
		.toSelf();
	container.bind(NetworkScanner).toSelf();
	container.bind(NodeScanner).toSelf();
	container.bind(OrganizationScanner).toSelf();
}

function loadUseCases(container: Container) {
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
	container.bind(ScanNetworkLooped).toSelf();
	container.bind<ScanNetwork>(ScanNetwork).toSelf();
}

function loadNodeScan(container: Container) {
	container.bind(NodeTomlFetcher).toSelf();
	container.bind(NodeScannerTomlStep).toSelf();
	container.bind(NodeScannerIndexerStep).toSelf();
	container.bind(NodeScannerHistoryArchiveStep).toSelf();
	container.bind(NodeScannerHomeDomainStep).toSelf();
	container.bind(NodeScannerGeoStep).toSelf();
	container.bind(NodeScannerCrawlStep).toSelf();
	container.bind(NodeScannerArchivalStep).toSelf();
}

function loadOrganizationScan(container: Container) {
	container.bind(OrganizationTomlFetcher).toSelf();
}

function loadSnapshotting(container: Container) {
	const dataSource = container.get<DataSource>(DataSource);
	container
		.bind<NodeRepository>(NETWORK_TYPES.NodeRepository)
		.toDynamicValue(() => {
			return new TypeOrmNodeRepository(dataSource.getRepository(Node));
		})
		.inRequestScope();
	container
		.bind<OrganizationRepository>(NETWORK_TYPES.OrganizationRepository)
		.toDynamicValue(() => {
			return new TypeOrmOrganizationRepository(
				dataSource.getRepository(Organization)
			);
		})
		.inRequestScope();

	container
		.bind<NodeSnapShotRepository>(NETWORK_TYPES.NodeSnapshotRepository)
		.toDynamicValue(() => {
			return new TypeOrmNodeSnapShotRepository(
				dataSource.getRepository(NodeSnapShot)
			);
		})
		.inRequestScope();
	container
		.bind<OrganizationSnapShotRepository>(
			NETWORK_TYPES.OrganizationSnapshotRepository
		)
		.toDynamicValue(() => {
			return new TypeOrmOrganizationSnapShotRepository(
				dataSource.getRepository(OrganizationSnapShot)
			);
		})
		.inRequestScope();
	container.bind<ValidatorDemoter>(ValidatorDemoter).toSelf();
	container.bind<InactiveNodesArchiver>(InactiveNodesArchiver).toSelf();
}
