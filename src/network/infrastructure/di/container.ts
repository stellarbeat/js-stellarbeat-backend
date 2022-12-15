import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { TYPES } from './di-types';
import { HistoryArchiveScanService } from '../../domain/history/HistoryArchiveScanService';
import { DatabaseHistoryArchiveScanService } from '../services/DatabaseHistoryArchiveScanService';
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
import { NetworkMeasurementService } from '../services/NetworkMeasurementService';
import { GetMeasurements } from '../../use-cases/get-measurements/GetMeasurements';
import NodeMeasurementService from '../services/NodeMeasurementService';
import OrganizationMeasurementService from '../services/OrganizationMeasurementService';
import { GetMeasurementsFactory } from '../../use-cases/get-measurements/GetMeasurementsFactory';
import { MeasurementService } from '../services/MeasurementService';
import { Measurement } from '../database/entities/OrganizationMeasurement';

export function load(container: Container) {
	container
		.bind<HistoryArchiveScanService>(TYPES.HistoryArchiveScanService)
		.to(DatabaseHistoryArchiveScanService);
	container.bind(NodeMeasurementAggregator).toSelf();
	container.bind(OrganizationMeasurementAggregator).toSelf();
	container.bind(NetworkMeasurementService).toSelf();
	container.bind(NodeMeasurementService).toSelf();
	container.bind(OrganizationMeasurementService).toSelf();

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
	container
		.bind<MeasurementService<Measurement>>('MeasurementService')
		.to(NodeMeasurementService)
		.whenTargetNamed('node');
	container
		.bind<MeasurementService<Measurement>>('MeasurementService')
		.to(OrganizationMeasurementService)
		.whenTargetNamed('organization');
	container
		.bind<MeasurementService<Measurement>>('MeasurementService')
		.to(NetworkMeasurementService)
		.whenTargetNamed('network');
}
