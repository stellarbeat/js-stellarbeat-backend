import { Scanner } from '../../domain/history-archive-scan/Scanner';
import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { getCustomRepository } from 'typeorm';
import { ScanRepository } from '../../domain/history-archive-scan/ScanRepository';
import { TypeOrmHistoryArchiveScanResultRepository } from '../database/TypeOrmHistoryArchiveScanResultRepository';
import { HASValidator } from '../../domain/history-archive/HASValidator';
import { CheckPointGenerator } from '../../domain/check-point/CheckPointGenerator';
import { CheckPointFrequency } from '../../domain/check-point/CheckPointFrequency';
import { TYPES } from './di-types';
import { StandardCheckPointFrequency } from '../../domain/check-point/StandardCheckPointFrequency';
import { HttpQueue } from '../../domain/HttpQueue';
import { CategoryScanner } from '../../domain/history-archive-scan/CategoryScanner';
import { BucketScanner } from '../../domain/history-archive-scan/BucketScanner';
import { RangeScanner } from '../../domain/history-archive-scan/RangeScanner';
import { VerifySingleArchive } from '../../use-cases/verify-single-archive/VerifySingleArchive';
import { VerifyArchives } from '../../use-cases/verify-archives/VerifyArchives';
import { ScanSettingsOptimizer } from '../../domain/history-archive-scan/ScanSettingsOptimizer';
import { ArchivePerformanceTester } from '../../domain/history-archive-scan/ArchivePerformanceTester';

export function load(container: Container, connectionName: string | undefined) {
	container.bind(CategoryScanner).toSelf();
	container.bind(BucketScanner).toSelf();
	container.bind(HASValidator).toSelf();
	container.bind(Scanner).toSelf();
	container.bind(RangeScanner).toSelf();
	container.bind(VerifySingleArchive).toSelf();
	container.bind(VerifyArchives).toSelf();
	container.bind(CheckPointGenerator).toSelf();
	container.bind(HttpQueue).toSelf();
	container.bind(ScanSettingsOptimizer).toSelf();
	container.bind(ArchivePerformanceTester).toSelf();
	container
		.bind<CheckPointFrequency>(TYPES.CheckPointFrequency)
		.toDynamicValue(() => {
			return new StandardCheckPointFrequency();
		});
	container
		.bind<ScanRepository>(TYPES.HistoryArchiveScanRepository)
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmHistoryArchiveScanResultRepository,
				connectionName
			);
		})
		.inRequestScope();
}
