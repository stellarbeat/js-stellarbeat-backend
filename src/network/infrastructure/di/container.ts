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
import { VersionedNetworkRepository } from '../../domain/VersionedNetworkRepository';
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

export function load(container: Container, connectionName: string | undefined) {
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
		.bind<VersionedNetworkRepository>(NETWORK_TYPES.VersionedNetworkRepository)
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

	loadSnapshotting(container, connectionName);
	loadRollup(container, connectionName);
	loadUseCases(container);
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
}
