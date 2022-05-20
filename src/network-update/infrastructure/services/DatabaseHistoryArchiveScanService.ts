import { HistoryArchiveScanService } from '../../domain/history/HistoryArchiveScanService';
import { HistoryArchiveScanRepository } from '../../../history-scan/domain/history-archive-scan/HistoryArchiveScanRepository';
import { HistoryArchiveScan } from '../../../network/domain/HistoryArchiveScan';

import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { injectable } from 'inversify';

//only dependency with history-archive package.
@injectable()
export class DatabaseHistoryArchiveScanService
	implements HistoryArchiveScanService
{
	constructor(
		private historyArchiveScanRepository: HistoryArchiveScanRepository
	) {}

	async findLatestScans(): Promise<Result<HistoryArchiveScan[], Error>> {
		try {
			const scans = await this.historyArchiveScanRepository.findLatest();
			const finishedScans = scans.filter((scan) => scan.endDate !== undefined);
			return ok(
				finishedScans.map(
					(scan) =>
						new HistoryArchiveScan(
							scan.baseUrl.value,
							scan.endDate as Date,
							scan.latestScannedLedger,
							scan.hasGap,
							scan.gapUrl,
							scan.gapCheckPoint
						)
				)
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}
}
