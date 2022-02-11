import { CheckPointScanner } from '../../domain/CheckPointScanner';
import { HistoryArchiveScanner } from '../../domain/HistoryArchiveScanner';
import { interfaces } from 'inversify';
import Container = interfaces.Container;

export function load(container: Container) {
	container.bind(CheckPointScanner).toSelf();
	container.bind(HistoryArchiveScanner).toSelf();
}
