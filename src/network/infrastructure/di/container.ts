import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { TYPES } from './di-types';
import { TYPES as HISTORY_TYPES } from '../../../history-scan/infrastructure/di/di-types';

import { HistoryArchiveScanService } from '../../domain/history/HistoryArchiveScanService';
import { DatabaseHistoryArchiveScanService } from '../services/DatabaseHistoryArchiveScanService';
import { ScanRepository } from '../../../history-scan/domain/scan/ScanRepository';
import { GetNetwork } from '../../use-cases/get-network/GetNetwork';
import { GetNetworkMonthStatistics } from '../../use-cases/get-network-month-statistics/GetNetworkMonthStatistics';
import { GetNetworkDayStatistics } from '../../use-cases/get-network-day-statistics/GetNetworkDayStatistics';
import { GetNetworkStatistics } from '../../use-cases/get-network-statistics/GetNetworkStatistics';

export function load(container: Container) {
	container
		.bind<HistoryArchiveScanService>(TYPES.HistoryArchiveScanService)
		.toDynamicValue(() => {
			return new DatabaseHistoryArchiveScanService(
				container.get<ScanRepository>(
					HISTORY_TYPES.HistoryArchiveScanRepository
				)
			);
		});

	loadUseCases(container);
}

function loadUseCases(container: Container) {
	container.bind(GetNetwork).toSelf();
	container.bind(GetNetworkMonthStatistics).toSelf();
	container.bind(GetNetworkDayStatistics).toSelf();
	container.bind(GetNetworkStatistics).toSelf();
}
