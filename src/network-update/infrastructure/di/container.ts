import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { TYPES } from './di-types';
import { TYPES as HISTORY_TYPES } from '../../../history-scan/infrastructure/di/di-types';

import { HistoryArchiveScanService } from '../../domain/history/HistoryArchiveScanService';
import { DatabaseHistoryArchiveScanService } from '../services/DatabaseHistoryArchiveScanService';
import { ScanRepository } from '../../../history-scan/domain/history-archive-scan/ScanRepository';

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
}
