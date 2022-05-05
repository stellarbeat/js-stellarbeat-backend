import { HistoryArchiveScanner } from '../../domain/history-archive-scan/HistoryArchiveScanner';
import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { ScanGaps } from '../../use-cases/scan-gaps/ScanGaps';
import { getCustomRepository } from 'typeorm';
import { HistoryArchiveScanRepository } from '../../domain/history-archive-scan/HistoryArchiveScanRepository';
import { TypeOrmHistoryArchiveScanResultRepository } from '../database/TypeOrmHistoryArchiveScanResultRepository';
import { UrlFetcher } from '../../domain/UrlFetcher';
import { HASValidator } from '../../domain/history-archive/HASValidator';
import { CheckPointGenerator } from '../../domain/check-point/CheckPointGenerator';
import { CheckPointFrequency } from '../../domain/check-point/CheckPointFrequency';
import { TYPES } from './di-types';
import { StandardCheckPointFrequency } from '../../domain/check-point/StandardCheckPointFrequency';
import { HttpQueue } from '../../domain/HttpQueue';

export function load(container: Container, connectionName: string | undefined) {
	container.bind(UrlFetcher).toSelf();
	container.bind(HASValidator).toSelf();
	container.bind(HistoryArchiveScanner).toSelf();
	container.bind(ScanGaps).toSelf();
	container.bind(CheckPointGenerator).toSelf();
	container.bind(HttpQueue).toSelf();
	container
		.bind<CheckPointFrequency>(TYPES.CheckPointFrequency)
		.toDynamicValue(() => {
			return new StandardCheckPointFrequency();
		});
	container
		.bind<HistoryArchiveScanRepository>('HistoryArchiveScanRepository')
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmHistoryArchiveScanResultRepository,
				connectionName
			);
		})
		.inRequestScope();
}
