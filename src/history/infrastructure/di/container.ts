import { CheckPointScanner } from '../../domain/CheckPointScanner';
import { HistoryArchiveScanner } from '../../domain/HistoryArchiveScanner';
import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { ScanGaps } from '../../use-cases/scan-gaps/ScanGaps';
import { getCustomRepository, getRepository } from 'typeorm';
import { HistoryArchiveScanRepository } from '../../domain/HistoryArchiveScanRepository';
import { TypeOrmHistoryArchiveScanRepository } from '../database/TypeOrmHistoryArchiveScanRepository';
import { UrlFetcher } from '../../domain/UrlFetcher';
import { HASFetcher } from '../../domain/HASFetcher';

export function load(container: Container, connectionName: string | undefined) {
	container.bind(CheckPointScanner).toSelf();
	container.bind(UrlFetcher).toSelf();
	container.bind(HASFetcher).toSelf();
	container.bind(HistoryArchiveScanner).toSelf();
	container.bind(ScanGaps).toSelf();
	container
		.bind<HistoryArchiveScanRepository>('HistoryArchiveScanRepository')
		.toDynamicValue(() => {
			return getCustomRepository(
				TypeOrmHistoryArchiveScanRepository,
				connectionName
			);
		})
		.inRequestScope();
}
