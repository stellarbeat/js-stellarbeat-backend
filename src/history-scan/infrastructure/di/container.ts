import { HistoryArchiveScanner } from '../../domain/history-archive-scan/HistoryArchiveScanner';
import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { ScanGaps } from '../../use-cases/scan-gaps/ScanGaps';
import { getCustomRepository } from 'typeorm';
import { HistoryArchiveScanRepository } from '../../domain/history-archive-scan/HistoryArchiveScanRepository';
import { TypeOrmHistoryArchiveScanResultRepository } from '../database/TypeOrmHistoryArchiveScanResultRepository';
import { HASValidator } from '../../domain/history-archive/HASValidator';
import { CheckPointGenerator } from '../../domain/check-point/CheckPointGenerator';
import { CheckPointFrequency } from '../../domain/check-point/CheckPointFrequency';
import { TYPES } from './di-types';
import { StandardCheckPointFrequency } from '../../domain/check-point/StandardCheckPointFrequency';
import { HttpQueue } from '../../domain/HttpQueue';
import { CategoryScanner } from '../../domain/history-archive-scan/CategoryScanner';
import { BucketScanner } from '../../domain/history-archive-scan/BucketScanner';
import { HistoryArchivePerformanceTester } from '../../domain/history-archive-scan/HistoryArchivePerformanceTester';
import { HistoryArchiveRangeScanner } from '../../domain/history-archive-scan/HistoryArchiveRangeScanner';

export function load(container: Container, connectionName: string | undefined) {
	container.bind(CategoryScanner).toSelf();
	container.bind(BucketScanner).toSelf();
	container.bind(HASValidator).toSelf();
	container.bind(HistoryArchiveScanner).toSelf();
	container.bind(HistoryArchiveRangeScanner).toSelf();
	container.bind(ScanGaps).toSelf();
	container.bind(CheckPointGenerator).toSelf();
	container.bind(HttpQueue).toSelf();
	container.bind(HistoryArchivePerformanceTester).toSelf();
	container
		.bind<CheckPointFrequency>(TYPES.CheckPointFrequency)
		.toDynamicValue(() => {
			return new StandardCheckPointFrequency();
		});
	container
		.bind<HistoryArchiveScanRepository>(TYPES.HistoryArchiveScanRepository)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmHistoryArchiveScanResultRepository,
				connectionName
			);
		})
		.inRequestScope();
}
