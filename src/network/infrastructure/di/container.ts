import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { GetNetwork } from '../../use-cases/get-network/GetNetwork';
import { GetNetworkMonthStatistics } from '../../use-cases/get-network-month-statistics/GetNetworkMonthStatistics';
import { GetNetworkDayStatistics } from '../../use-cases/get-network-day-statistics/GetNetworkDayStatistics';
import { GetLatestNodeSnapshots } from '../../use-cases/get-latest-node-snapshots/GetLatestNodeSnapshots';
import { GetLatestOrganizationSnapshots } from '../../use-cases/get-latest-organization-snapshots/GetLatestOrganizationSnapshots';
import { GetNodes } from '../../use-cases/get-nodes/GetNodes';
import { GetNode } from '../../use-cases/get-node/GetNode';
import { GetNodeSnapshots } from '../../use-cases/get-node-snapshots/GetNodeSnapshots';
import { GetNodeDayStatistics } from '../../use-cases/get-node-day-statistics/GetNodeDayStatistics';
import { GetOrganization } from '../../use-cases/get-organization/GetOrganization';
import { GetOrganizations } from '../../use-cases/get-organizations/GetOrganizations';
import { GetOrganizationDayStatistics } from '../../use-cases/get-organization-day-statistics/GetOrganizationDayStatistics';
import { GetOrganizationSnapshots } from '../../use-cases/get-organization-snapshots/GetOrganizationSnapshots';
import NodeMeasurementAggregator from '../services/NodeMeasurementAggregator';
import OrganizationMeasurementAggregator from '../services/OrganizationMeasurementAggregator';
import { GetMeasurements } from '../../use-cases/get-measurements/GetMeasurements';
import { GetMeasurementsFactory } from '../../use-cases/get-measurements/GetMeasurementsFactory';
import { getCustomRepository } from 'typeorm';
import { DatabaseHistoryArchiveScanService } from '../services/DatabaseHistoryArchiveScanService';
import { HistoryArchiveScanService } from '../../domain/history/HistoryArchiveScanService';
import { NETWORK_TYPES } from './di-types';
import { NodeMeasurementRepository } from '../../domain/measurement/NodeMeasurementRepository';
import { TypeOrmOrganizationMeasurementRepository } from '../database/repositories/TypeOrmOrganizationMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../domain/measurement/OrganizationMeasurementRepository';
import { TypeOrmNodeMeasurementRepository } from '../database/repositories/TypeOrmNodeMeasurementRepository';
import { NetworkMeasurementRepository } from '../../domain/measurement/NetworkMeasurementRepository';
import { TypeOrmNetworkMeasurementRepository } from '../database/repositories/TypeOrmNetworkMeasurementRepository';

export function load(container: Container, connectionName: string | undefined) {
	container.bind(NodeMeasurementAggregator).toSelf();
	container.bind(OrganizationMeasurementAggregator).toSelf();
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
	loadUseCases(container);
}

function loadUseCases(container: Container) {
	container.bind(GetNetwork).toSelf();
	container.bind(GetNetworkMonthStatistics).toSelf();
	container.bind(GetNetworkDayStatistics).toSelf();
	container.bind(GetLatestNodeSnapshots).toSelf();
	container.bind(GetLatestOrganizationSnapshots).toSelf();
	container.bind(GetNodes).toSelf();
	container.bind(GetNode).toSelf();
	container.bind(GetNodeSnapshots).toSelf();
	container.bind(GetNodeDayStatistics).toSelf();
	container.bind(GetOrganization).toSelf();
	container.bind(GetOrganizations).toSelf();
	container.bind(GetOrganizationDayStatistics).toSelf();
	container.bind(GetOrganizationSnapshots).toSelf();
	container.bind(GetMeasurements).toSelf();
	container.bind(GetMeasurementsFactory).toSelf();
}
