import { CheckPointScanner } from '../../domain/CheckPointScanner';
import { HistoryArchiveScanner } from '../../domain/HistoryArchiveScanner';
import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { ScanGaps } from '../../use-cases/scan-gaps/ScanGaps';

export function load(container: Container) {
	container.bind(CheckPointScanner).toSelf();
	container.bind(HistoryArchiveScanner).toSelf();
	container.bind(ScanGaps).toSelf();
}
