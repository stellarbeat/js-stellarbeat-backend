import { CheckPointScanner } from '../../domain/CheckPointScanner';
import { HistoryArchiveScanner } from '../../domain/HistoryArchiveScanner';
import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { ScanGaps } from '../../use-cases/scan-gaps/ScanGaps';
import { getCustomRepository } from 'typeorm';
import { HistoryArchiveScanSummaryRepository } from '../../domain/HistoryArchiveScanSummaryRepository';
import { TypeOrmHistoryArchiveScanResultRepository } from '../database/TypeOrmHistoryArchiveScanResultRepository';
import { UrlFetcher } from '../../domain/UrlFetcher';
import { HASFetcher } from '../../domain/HASFetcher';
import { BucketScanner } from '../../domain/BucketScanner';

export function load(container: Container, connectionName: string | undefined) {
	container.bind(CheckPointScanner).toSelf();
	container.bind(UrlFetcher).toSelf();
	container.bind(HASFetcher).toSelf();
	container.bind(HistoryArchiveScanner).toSelf();
	container.bind(ScanGaps).toSelf();
	container
		.bind<HistoryArchiveScanSummaryRepository>('HistoryArchiveScanRepository')
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmHistoryArchiveScanResultRepository,
				connectionName
			);
		})
		.inRequestScope();
	container.bind(BucketScanner).toSelf();
}
